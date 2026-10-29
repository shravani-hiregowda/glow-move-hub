import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/client";
import {
  CreateWorkoutInput,
  UpdateWorkoutInput,
  WorkoutFilterQueryInput,
  WorkoutDto,
} from "@jerai/shared";
import { Prisma } from "@prisma/client";

function formatWorkoutResponse(w: {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  bodyPart: string;
  duration: string;
  calories: number;
  videoUrl: string;
  image: string;
  createdAt: Date;
  updatedAt: Date;
  steps?: { id?: string; stepOrder: number; instruction: string }[];
}): WorkoutDto {
  const stepItems = w.steps ?? [];
  return {
    id: w.id,
    title: w.title,
    description: w.description,
    difficulty: w.difficulty as WorkoutDto["difficulty"],
    bodyPart: w.bodyPart as WorkoutDto["bodyPart"],
    duration: w.duration,
    calories: w.calories,
    videoUrl: w.videoUrl,
    image: w.image,
    steps: stepItems.slice().sort((a, b) => a.stepOrder - b.stepOrder).map((s) => s.instruction),
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

export async function listWorkouts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as WorkoutFilterQueryInput;
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.WorkoutWhereInput = {};

    if (query.bodyPart && query.bodyPart !== "All") {
      where.bodyPart = {
        equals: query.bodyPart,
        mode: "insensitive",
      };
    }

    if (query.difficulty) {
      where.difficulty = query.difficulty;
    }

    if (query.search && query.search.trim() !== "") {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ];
    }

    const [total, workouts] = await Promise.all([
      prisma.workout.count({ where }),
      prisma.workout.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "asc" },
        include: {
          steps: {
            orderBy: { stepOrder: "asc" },
          },
        },
      }),
    ]);

    const formatted = workouts.map(formatWorkoutResponse);

    res.status(200).json({
      success: true,
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getWorkoutById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = String(req.params.id);

    const workout = await prisma.workout.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { stepOrder: "asc" },
        },
      },
    });

    if (!workout) {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Workout with ID '${id}' was not found.`,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: formatWorkoutResponse(workout),
    });
  } catch (err) {
    next(err);
  }
}

export async function createWorkout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as CreateWorkoutInput;

    const created = await prisma.workout.create({
      data: {
        ...(body.id ? { id: body.id } : {}),
        title: body.title,
        description: body.description,
        difficulty: body.difficulty,
        bodyPart: body.bodyPart,
        duration: body.duration,
        calories: body.calories,
        videoUrl: body.videoUrl,
        image: body.image,
        steps: {
          create: body.steps.map((instruction: string, index: number) => ({
            stepOrder: index + 1,
            instruction,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { stepOrder: "asc" },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: formatWorkoutResponse(created),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateWorkout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = String(req.params.id);
    const body = req.body as UpdateWorkoutInput;

    // Check existence first
    const existing = await prisma.workout.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Workout with ID '${id}' was not found.`,
        },
      });
      return;
    }

    // Perform update in transaction if steps are included
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (body.steps) {
        await tx.workoutStep.deleteMany({
          where: { workoutId: id },
        });

        await tx.workoutStep.createMany({
          data: body.steps.map((instruction: string, index: number) => ({
            workoutId: id,
            stepOrder: index + 1,
            instruction,
          })),
        });
      }

      return tx.workout.update({
        where: { id },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.difficulty !== undefined ? { difficulty: body.difficulty } : {}),
          ...(body.bodyPart !== undefined ? { bodyPart: body.bodyPart } : {}),
          ...(body.duration !== undefined ? { duration: body.duration } : {}),
          ...(body.calories !== undefined ? { calories: body.calories } : {}),
          ...(body.videoUrl !== undefined ? { videoUrl: body.videoUrl } : {}),
          ...(body.image !== undefined ? { image: body.image } : {}),
        },
        include: {
          steps: {
            orderBy: { stepOrder: "asc" },
          },
        },
      });
    });

    res.status(200).json({
      success: true,
      data: formatWorkoutResponse(updated),
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteWorkout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = String(req.params.id);

    const existing = await prisma.workout.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Workout with ID '${id}' was not found.`,
        },
      });
      return;
    }

    await prisma.workout.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: `Workout '${id}' was successfully deleted.`,
    });
  } catch (err) {
    next(err);
  }
}
