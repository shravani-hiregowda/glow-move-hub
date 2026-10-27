import { prisma } from "../db/client";
import { Prisma, WorkoutSessionStatus as PrismaSessionStatus } from "@prisma/client";
import {
  WorkoutSessionDto,
  WorkoutProgressSummaryDto,
  WorkoutSessionStatus,
  PaginatedResponse,
  StartWorkoutSessionInput,
  UpdateWorkoutSessionProgressInput,
  CompleteWorkoutSessionInput,
  WorkoutSessionFilterQueryInput,
} from "@jerai/shared";

export class SessionServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "SessionServiceError";
  }
}

interface PrismaSessionWithRelations {
  id: string;
  userId: string;
  workoutId: string;
  status: WorkoutSessionStatus;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number;
  currentStepIndex: number;
  workoutTitle: string;
  workoutCalories: number;
  totalSteps: number;
  createdAt: Date;
  updatedAt: Date;
  completedSteps?: Array<{
    id: string;
    stepIndex: number;
    completedAt: Date;
  }>;
  workout?: {
    id: string;
    title: string;
    description: string;
    difficulty: string;
    bodyPart: string;
    duration: string;
    calories: number;
    videoUrl: string;
    image: string;
    steps?: Array<{ stepOrder: number; instruction: string }>;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

export function formatSessionDto(session: PrismaSessionWithRelations): WorkoutSessionDto {
  const steps = session.completedSteps ?? [];
  const completedStepIndices = steps
    .map((s) => s.stepIndex)
    .sort((a, b) => a - b);

  return {
    id: session.id,
    userId: session.userId,
    workoutId: session.workoutId,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt ? session.endedAt.toISOString() : null,
    durationSeconds: session.durationSeconds,
    currentStepIndex: session.currentStepIndex,
    workoutTitle: session.workoutTitle,
    workoutCalories: session.workoutCalories,
    totalSteps: session.totalSteps,
    completedStepIndices,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    workout: session.workout
      ? {
          id: session.workout.id,
          title: session.workout.title,
          description: session.workout.description,
          difficulty: session.workout.difficulty as WorkoutSessionDto["workout"] extends { difficulty: infer D } ? D : never,
          bodyPart: session.workout.bodyPart as WorkoutSessionDto["workout"] extends { bodyPart: infer B } ? B : never,
          duration: session.workout.duration,
          calories: session.workout.calories,
          videoUrl: session.workout.videoUrl,
          image: session.workout.image,
          steps: (session.workout.steps ?? [])
            .slice()
            .sort((a, b) => a.stepOrder - b.stepOrder)
            .map((s) => s.instruction),
          createdAt: session.workout.createdAt.toISOString(),
          updatedAt: session.workout.updatedAt.toISOString(),
        }
      : undefined,
  };
}

export async function startSession(
  userId: string,
  input: StartWorkoutSessionInput
): Promise<WorkoutSessionDto> {
  const workout = await prisma.workout.findUnique({
    where: { id: input.workoutId },
    include: {
      steps: {
        orderBy: { stepOrder: "asc" },
      },
    },
  });

  if (!workout) {
    throw new SessionServiceError(404, "WORKOUT_NOT_FOUND", "The requested workout was not found.");
  }

  // Atomically handle any existing IN_PROGRESS session by marking it ABANDONED,
  // ensuring the user has only 1 active session at any given time.
  return await prisma.$transaction(async (tx) => {
    await tx.workoutSession.updateMany({
      where: {
        userId,
        status: "IN_PROGRESS",
      },
      data: {
        status: "ABANDONED",
        endedAt: new Date(),
      },
    });

    const newSession = await tx.workoutSession.create({
      data: {
        userId,
        workoutId: workout.id,
        status: "IN_PROGRESS",
        startedAt: new Date(),
        currentStepIndex: 0,
        durationSeconds: 0,
        workoutTitle: workout.title,
        workoutCalories: workout.calories,
        totalSteps: workout.steps.length,
      },
      include: {
        completedSteps: true,
        workout: {
          include: {
            steps: { orderBy: { stepOrder: "asc" } },
          },
        },
      },
    });

    return formatSessionDto(newSession as unknown as PrismaSessionWithRelations);
  });
}

export async function getActiveSession(userId: string): Promise<WorkoutSessionDto | null> {
  const session = await prisma.workoutSession.findFirst({
    where: {
      userId,
      status: "IN_PROGRESS",
    },
    orderBy: {
      startedAt: "desc",
    },
    include: {
      completedSteps: true,
      workout: {
        include: {
          steps: { orderBy: { stepOrder: "asc" } },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  return formatSessionDto(session as unknown as PrismaSessionWithRelations);
}

export async function getSessionById(userId: string, sessionId: string): Promise<WorkoutSessionDto> {
  const session = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: {
      completedSteps: true,
      workout: {
        include: {
          steps: { orderBy: { stepOrder: "asc" } },
        },
      },
    },
  });

  if (!session || session.userId !== userId) {
    throw new SessionServiceError(404, "SESSION_NOT_FOUND", "Workout session not found.");
  }

  return formatSessionDto(session as unknown as PrismaSessionWithRelations);
}

export function validateStepIndices(
  totalSteps: number,
  currentStepIndex?: number,
  completedStepIndices?: number[]
): void {
  if (currentStepIndex !== undefined) {
    if (typeof currentStepIndex !== "number" || !Number.isInteger(currentStepIndex)) {
      throw new SessionServiceError(
        400,
        "INVALID_STEP_INDEX",
        "currentStepIndex must be an integer."
      );
    }
    if (currentStepIndex < 0) {
      throw new SessionServiceError(
        400,
        "INVALID_STEP_INDEX",
        `currentStepIndex cannot be negative (received ${currentStepIndex}).`
      );
    }
    if (totalSteps <= 0 || currentStepIndex >= totalSteps) {
      throw new SessionServiceError(
        400,
        "INVALID_STEP_INDEX",
        `currentStepIndex ${currentStepIndex} is out of bounds for workout session with ${totalSteps} total step(s). Step index must be between 0 and ${Math.max(0, totalSteps - 1)}.`
      );
    }
  }

  if (completedStepIndices !== undefined) {
    if (!Array.isArray(completedStepIndices)) {
      throw new SessionServiceError(
        400,
        "INVALID_STEP_INDEX",
        "completedStepIndices must be an array of integers."
      );
    }

    const seen = new Set<number>();
    for (const idx of completedStepIndices) {
      if (typeof idx !== "number" || !Number.isInteger(idx)) {
        throw new SessionServiceError(
          400,
          "INVALID_STEP_INDEX",
          "completedStepIndices must contain only valid integers."
        );
      }
      if (idx < 0) {
        throw new SessionServiceError(
          400,
          "INVALID_STEP_INDEX",
          `completedStepIndex cannot be negative (received ${idx}).`
        );
      }
      if (totalSteps <= 0 || idx >= totalSteps) {
        throw new SessionServiceError(
          400,
          "INVALID_STEP_INDEX",
          `completedStepIndex ${idx} is out of bounds for workout session with ${totalSteps} total step(s). Step index must be between 0 and ${Math.max(0, totalSteps - 1)}.`
        );
      }
      if (seen.has(idx)) {
        throw new SessionServiceError(
          400,
          "INVALID_STEP_INDEX",
          `Duplicate step index ${idx} in completedStepIndices.`
        );
      }
      seen.add(idx);
    }
  }
}

export async function updateSessionProgress(
  userId: string,
  sessionId: string,
  input: UpdateWorkoutSessionProgressInput
): Promise<WorkoutSessionDto> {
  const existing = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: {
      completedSteps: true,
    },
  });

  if (!existing || existing.userId !== userId) {
    throw new SessionServiceError(404, "SESSION_NOT_FOUND", "Workout session not found.");
  }

  if (existing.status !== "IN_PROGRESS") {
    throw new SessionServiceError(
      400,
      "INVALID_SESSION_STATUS",
      `Cannot update progress on a session that is already ${existing.status.toLowerCase()}.`
    );
  }

  validateStepIndices(
    existing.totalSteps,
    input.currentStepIndex,
    input.completedStepIndices
  );

  return await prisma.$transaction(async (tx) => {
    // If completedStepIndices provided, insert missing steps
    if (input.completedStepIndices && input.completedStepIndices.length > 0) {
      const existingIndices = new Set(existing.completedSteps.map((s) => s.stepIndex));
      const newIndices = input.completedStepIndices.filter((idx) => !existingIndices.has(idx));

      for (const stepIndex of newIndices) {
        await tx.workoutSessionStep.create({
          data: {
            workoutSessionId: sessionId,
            stepIndex,
          },
        });
      }
    }

    const updated = await tx.workoutSession.update({
      where: { id: sessionId },
      data: {
        currentStepIndex:
          input.currentStepIndex !== undefined ? input.currentStepIndex : undefined,
        durationSeconds:
          input.durationSeconds !== undefined
            ? Math.max(existing.durationSeconds, input.durationSeconds)
            : undefined,
      },
      include: {
        completedSteps: true,
        workout: {
          include: {
            steps: { orderBy: { stepOrder: "asc" } },
          },
        },
      },
    });

    return formatSessionDto(updated as unknown as PrismaSessionWithRelations);
  });
}

export async function completeSession(
  userId: string,
  sessionId: string,
  input?: CompleteWorkoutSessionInput
): Promise<WorkoutSessionDto> {
  const existing = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: {
      completedSteps: true,
    },
  });

  if (!existing || existing.userId !== userId) {
    throw new SessionServiceError(404, "SESSION_NOT_FOUND", "Workout session not found.");
  }

  if (existing.status !== "IN_PROGRESS") {
    throw new SessionServiceError(
      400,
      "INVALID_SESSION_STATUS",
      `Cannot complete a session that is already ${existing.status.toLowerCase()}.`
    );
  }

  validateStepIndices(
    existing.totalSteps,
    undefined,
    input?.completedStepIndices
  );

  return await prisma.$transaction(async (tx) => {
    if (input?.completedStepIndices && input.completedStepIndices.length > 0) {
      const existingIndices = new Set(existing.completedSteps.map((s) => s.stepIndex));
      const newIndices = input.completedStepIndices.filter((idx) => !existingIndices.has(idx));

      for (const stepIndex of newIndices) {
        await tx.workoutSessionStep.create({
          data: {
            workoutSessionId: sessionId,
            stepIndex,
          },
        });
      }
    }

    const updated = await tx.workoutSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        endedAt: new Date(),
        durationSeconds:
          input?.durationSeconds !== undefined
            ? Math.max(existing.durationSeconds, input.durationSeconds)
            : undefined,
      },
      include: {
        completedSteps: true,
        workout: {
          include: {
            steps: { orderBy: { stepOrder: "asc" } },
          },
        },
      },
    });

    return formatSessionDto(updated as unknown as PrismaSessionWithRelations);
  });
}

export async function abandonSession(
  userId: string,
  sessionId: string
): Promise<WorkoutSessionDto> {
  const existing = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
  });

  if (!existing || existing.userId !== userId) {
    throw new SessionServiceError(404, "SESSION_NOT_FOUND", "Workout session not found.");
  }

  if (existing.status !== "IN_PROGRESS") {
    throw new SessionServiceError(
      400,
      "INVALID_SESSION_STATUS",
      `Cannot abandon a session that is already ${existing.status.toLowerCase()}.`
    );
  }

  const updated = await prisma.workoutSession.update({
    where: { id: sessionId },
    data: {
      status: "ABANDONED",
      endedAt: new Date(),
    },
    include: {
      completedSteps: true,
      workout: {
        include: {
          steps: { orderBy: { stepOrder: "asc" } },
        },
      },
    },
  });

  return formatSessionDto(updated as unknown as PrismaSessionWithRelations);
}

export async function listUserSessions(
  userId: string,
  query: WorkoutSessionFilterQueryInput
): Promise<PaginatedResponse<WorkoutSessionDto>> {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.WorkoutSessionWhereInput = {
    userId,
    ...(query.status ? { status: query.status as PrismaSessionStatus } : {}),
  };

  const [sessions, total] = await Promise.all([
    prisma.workoutSession.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip,
      take: limit,
      include: {
        completedSteps: true,
        workout: {
          include: {
            steps: { orderBy: { stepOrder: "asc" } },
          },
        },
      },
    }),
    prisma.workoutSession.count({ where }),
  ]);

  return {
    data: sessions.map((s) => formatSessionDto(s as unknown as PrismaSessionWithRelations)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getUserProgressSummary(userId: string): Promise<WorkoutProgressSummaryDto> {
  const [completedCount, aggregateSum, activeSession, recentSessions] = await Promise.all([
    prisma.workoutSession.count({
      where: {
        userId,
        status: "COMPLETED",
      },
    }),
    prisma.workoutSession.aggregate({
      where: {
        userId,
        status: "COMPLETED",
      },
      _sum: {
        durationSeconds: true,
        workoutCalories: true,
      },
    }),
    getActiveSession(userId),
    prisma.workoutSession.findMany({
      where: {
        userId,
        status: "COMPLETED",
      },
      orderBy: {
        endedAt: "desc",
      },
      take: 5,
      include: {
        completedSteps: true,
        workout: {
          include: {
            steps: { orderBy: { stepOrder: "asc" } },
          },
        },
      },
    }),
  ]);

  return {
    totalWorkoutsCompleted: completedCount,
    totalDurationSeconds: aggregateSum._sum.durationSeconds || 0,
    totalCaloriesBurned: aggregateSum._sum.workoutCalories || 0,
    activeSession,
    recentSessions: recentSessions.map((s) =>
      formatSessionDto(s as unknown as PrismaSessionWithRelations)
    ),
  };
}
