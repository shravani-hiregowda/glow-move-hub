import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../app";
import { prisma } from "../db/client";
import {
  SESSION_COOKIE_NAME,
  CSRF_COOKIE_NAME,
} from "../utils/session";

vi.mock("../db/client", () => {
  return {
    prisma: {
      $transaction: vi.fn(),
      user: {
        findUnique: vi.fn(),
      },
      session: {
        findUnique: vi.fn(),
        delete: vi.fn(),
      },
      workout: {
        findUnique: vi.fn(),
      },
      workoutSession: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
        aggregate: vi.fn(),
      },
      workoutSessionStep: {
        create: vi.fn(),
        createMany: vi.fn(),
      },
    },
    checkDatabaseConnection: vi.fn(),
    disconnectDatabase: vi.fn(),
  };
});

describe("Workout Session & Progress API", () => {
  const memberA = {
    id: "sess-user-a",
    userId: "u-member-a",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    user: {
      id: "u-member-a",
      email: "member_a@example.com",
      role: "MEMBER" as const,
    },
  };

  const memberB = {
    id: "sess-user-b",
    userId: "u-member-b",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    user: {
      id: "u-member-b",
      email: "member_b@example.com",
      role: "MEMBER" as const,
    },
  };

  const mockWorkout = {
    id: "w-chest-1",
    title: "Push-Up Power",
    description: "Classic chest routine",
    difficulty: "Beginner",
    bodyPart: "Chest",
    duration: "15 min",
    calories: 120,
    videoUrl: "",
    image: "/assets/chest.jpg",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    steps: [
      { id: "step-1", stepOrder: 1, instruction: "Plank position" },
      { id: "step-2", stepOrder: 2, instruction: "Lower chest" },
      { id: "step-3", stepOrder: 3, instruction: "Push back up" },
    ],
  };

  const mockSessionUserA = {
    id: "sess-rec-1",
    userId: "u-member-a",
    workoutId: "w-chest-1",
    status: "IN_PROGRESS" as const,
    startedAt: new Date("2026-10-26T10:00:00Z"),
    endedAt: null,
    durationSeconds: 60,
    currentStepIndex: 1,
    workoutTitle: "Push-Up Power",
    workoutCalories: 120,
    totalSteps: 3,
    createdAt: new Date("2026-10-26T10:00:00Z"),
    updatedAt: new Date("2026-10-26T10:01:00Z"),
    completedSteps: [
      { id: "step-rec-1", stepIndex: 0, completedAt: new Date("2026-10-26T10:00:30Z") },
    ],
    workout: mockWorkout,
  };

  const authHeaders = {
    Cookie: [`${SESSION_COOKIE_NAME}=tok-a`, `${CSRF_COOKIE_NAME}=csrf-tok`],
    "x-csrf-token": "csrf-tok",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.session.findUnique).mockResolvedValue(memberA as never);
  });

  describe("Authentication & Authorization Enforcement", () => {
    it("rejects unauthenticated requests with 401 UNAUTHORIZED", async () => {
      vi.mocked(prisma.session.findUnique).mockResolvedValue(null as never);

      const endpoints = [
        request(app).post("/api/v1/sessions").send({ workoutId: "w-1" }),
        request(app).get("/api/v1/sessions/active"),
        request(app).get("/api/v1/sessions/summary"),
        request(app).get("/api/v1/sessions"),
        request(app).get("/api/v1/sessions/sess-rec-1"),
        request(app).patch("/api/v1/sessions/sess-rec-1/progress").send({ currentStepIndex: 1 }),
        request(app).post("/api/v1/sessions/sess-rec-1/complete"),
        request(app).post("/api/v1/sessions/sess-rec-1/abandon"),
      ];

      for (const reqPromise of endpoints) {
        const res = await reqPromise;
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe("UNAUTHORIZED");
      }
    });
  });

  describe("POST /api/v1/sessions — Start Session", () => {
    it("validates request payload and rejects empty workoutId", async () => {
      const res = await request(app)
        .post("/api/v1/sessions")
        .set(authHeaders)
        .send({ workoutId: "   " });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 404 if the requested workout does not exist", async () => {
      vi.mocked(prisma.workout.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .post("/api/v1/sessions")
        .set(authHeaders)
        .send({ workoutId: "nonexistent-id" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("WORKOUT_NOT_FOUND");
    });

    it("starts a session, auto-abandons any existing active session, and snapshots workout data", async () => {
      vi.mocked(prisma.workout.findUnique).mockResolvedValue(mockWorkout as never);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return callback({
          workoutSession: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            create: vi.fn().mockResolvedValue(mockSessionUserA),
          },
        } as never);
      });

      const res = await request(app)
        .post("/api/v1/sessions")
        .set(authHeaders)
        .send({ workoutId: "w-chest-1" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe("sess-rec-1");
      expect(res.body.data.status).toBe("IN_PROGRESS");
      expect(res.body.data.workoutTitle).toBe("Push-Up Power");
      expect(res.body.data.workoutCalories).toBe(120);
      expect(res.body.data.totalSteps).toBe(3);
    });
  });

  describe("GET /api/v1/sessions/active", () => {
    it("returns active in-progress session if found", async () => {
      vi.mocked(prisma.workoutSession.findFirst).mockResolvedValue(mockSessionUserA as never);

      const res = await request(app)
        .get("/api/v1/sessions/active")
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe("sess-rec-1");
      expect(res.body.data.status).toBe("IN_PROGRESS");
      expect(res.body.data.completedStepIndices).toEqual([0]);
    });

    it("returns null if user has no active session", async () => {
      vi.mocked(prisma.workoutSession.findFirst).mockResolvedValue(null);

      const res = await request(app)
        .get("/api/v1/sessions/active")
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
    });
  });

  describe("Member Access Isolation & Ownership Protection", () => {
    it("prevents user B from reading user A's session by returning 404", async () => {
      vi.mocked(prisma.session.findUnique).mockResolvedValue(memberB as never);
      vi.mocked(prisma.workoutSession.findUnique).mockResolvedValue(mockSessionUserA as never);

      const res = await request(app)
        .get("/api/v1/sessions/sess-rec-1")
        .set({
          Cookie: [`${SESSION_COOKIE_NAME}=tok-b`, `${CSRF_COOKIE_NAME}=csrf-tok`],
          "x-csrf-token": "csrf-tok",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("SESSION_NOT_FOUND");
    });

    it("prevents user B from mutating progress on user A's session", async () => {
      vi.mocked(prisma.session.findUnique).mockResolvedValue(memberB as never);
      vi.mocked(prisma.workoutSession.findUnique).mockResolvedValue(mockSessionUserA as never);

      const res = await request(app)
        .patch("/api/v1/sessions/sess-rec-1/progress")
        .set({
          Cookie: [`${SESSION_COOKIE_NAME}=tok-b`, `${CSRF_COOKIE_NAME}=csrf-tok`],
          "x-csrf-token": "csrf-tok",
        })
        .send({ currentStepIndex: 2 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("SESSION_NOT_FOUND");
    });

    it("prevents user B from completing user A's session", async () => {
      vi.mocked(prisma.session.findUnique).mockResolvedValue(memberB as never);
      vi.mocked(prisma.workoutSession.findUnique).mockResolvedValue(mockSessionUserA as never);

      const res = await request(app)
        .post("/api/v1/sessions/sess-rec-1/complete")
        .set({
          Cookie: [`${SESSION_COOKIE_NAME}=tok-b`, `${CSRF_COOKIE_NAME}=csrf-tok`],
          "x-csrf-token": "csrf-tok",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("SESSION_NOT_FOUND");
    });

    it("prevents user B from abandoning user A's session", async () => {
      vi.mocked(prisma.session.findUnique).mockResolvedValue(memberB as never);
      vi.mocked(prisma.workoutSession.findUnique).mockResolvedValue(mockSessionUserA as never);

      const res = await request(app)
        .post("/api/v1/sessions/sess-rec-1/abandon")
        .set({
          Cookie: [`${SESSION_COOKIE_NAME}=tok-b`, `${CSRF_COOKIE_NAME}=csrf-tok`],
          "x-csrf-token": "csrf-tok",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("SESSION_NOT_FOUND");
    });
  });

  describe("PATCH /api/v1/sessions/:id/progress — Progress Updates", () => {
    it("updates progress and step completions in active session", async () => {
      vi.mocked(prisma.workoutSession.findUnique).mockResolvedValue(mockSessionUserA as never);

      const updatedRecord = {
        ...mockSessionUserA,
        currentStepIndex: 2,
        durationSeconds: 120,
        completedSteps: [
          { id: "step-rec-1", stepIndex: 0, completedAt: new Date() },
          { id: "step-rec-2", stepIndex: 1, completedAt: new Date() },
        ],
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return callback({
          workoutSessionStep: {
            create: vi.fn().mockResolvedValue({ id: "step-rec-2" }),
          },
          workoutSession: {
            update: vi.fn().mockResolvedValue(updatedRecord),
          },
        } as never);
      });

      const res = await request(app)
        .patch("/api/v1/sessions/sess-rec-1/progress")
        .set(authHeaders)
        .send({
          currentStepIndex: 2,
          durationSeconds: 120,
          completedStepIndices: [0, 1],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentStepIndex).toBe(2);
      expect(res.body.data.durationSeconds).toBe(120);
      expect(res.body.data.completedStepIndices).toEqual([0, 1]);
    });

    it("rejects progress updates on an already COMPLETED session", async () => {
      vi.mocked(prisma.workoutSession.findUnique).mockResolvedValue({
        ...mockSessionUserA,
        status: "COMPLETED",
      } as never);

      const res = await request(app)
        .patch("/api/v1/sessions/sess-rec-1/progress")
        .set(authHeaders)
        .send({ currentStepIndex: 2 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_SESSION_STATUS");
    });

    it("rejects progress updates on an already ABANDONED session", async () => {
      vi.mocked(prisma.workoutSession.findUnique).mockResolvedValue({
        ...mockSessionUserA,
        status: "ABANDONED",
      } as never);

      const res = await request(app)
        .patch("/api/v1/sessions/sess-rec-1/progress")
        .set(authHeaders)
        .send({ currentStepIndex: 2 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_SESSION_STATUS");
    });
  });

  describe("POST /api/v1/sessions/:id/complete — Complete Session", () => {
    it("completes active session and transitions status to COMPLETED", async () => {
      vi.mocked(prisma.workoutSession.findUnique).mockResolvedValue(mockSessionUserA as never);

      const completedRecord = {
        ...mockSessionUserA,
        status: "COMPLETED",
        endedAt: new Date("2026-10-26T10:15:00Z"),
        durationSeconds: 900,
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return callback({
          workoutSessionStep: {
            create: vi.fn(),
          },
          workoutSession: {
            update: vi.fn().mockResolvedValue(completedRecord),
          },
        } as never);
      });

      const res = await request(app)
        .post("/api/v1/sessions/sess-rec-1/complete")
        .set(authHeaders)
        .send({ durationSeconds: 900 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("COMPLETED");
      expect(res.body.data.endedAt).not.toBeNull();
      expect(res.body.data.durationSeconds).toBe(900);
    });

    it("rejects completing an already terminal session", async () => {
      vi.mocked(prisma.workoutSession.findUnique).mockResolvedValue({
        ...mockSessionUserA,
        status: "COMPLETED",
      } as never);

      const res = await request(app)
        .post("/api/v1/sessions/sess-rec-1/complete")
        .set(authHeaders);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_SESSION_STATUS");
    });
  });

  describe("POST /api/v1/sessions/:id/abandon — Abandon Session", () => {
    it("abandons active session and transitions status to ABANDONED", async () => {
      vi.mocked(prisma.workoutSession.findUnique).mockResolvedValue(mockSessionUserA as never);

      const abandonedRecord = {
        ...mockSessionUserA,
        status: "ABANDONED",
        endedAt: new Date("2026-10-26T10:05:00Z"),
      };

      vi.mocked(prisma.workoutSession.update).mockResolvedValue(abandonedRecord as never);

      const res = await request(app)
        .post("/api/v1/sessions/sess-rec-1/abandon")
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("ABANDONED");
      expect(res.body.data.endedAt).not.toBeNull();
    });

    it("rejects abandoning an already completed session", async () => {
      vi.mocked(prisma.workoutSession.findUnique).mockResolvedValue({
        ...mockSessionUserA,
        status: "COMPLETED",
      } as never);

      const res = await request(app)
        .post("/api/v1/sessions/sess-rec-1/abandon")
        .set(authHeaders);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_SESSION_STATUS");
    });
  });

  describe("GET /api/v1/sessions — History List & Pagination", () => {
    it("returns paginated session list for authenticated user", async () => {
      vi.mocked(prisma.workoutSession.findMany).mockResolvedValue([mockSessionUserA] as never);
      vi.mocked(prisma.workoutSession.count).mockResolvedValue(1);

      const res = await request(app)
        .get("/api/v1/sessions?page=1&limit=10")
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it("rejects invalid status filter", async () => {
      const res = await request(app)
        .get("/api/v1/sessions?status=INVALID_STATUS")
        .set(authHeaders);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/v1/sessions/summary — Progress Summary", () => {
    it("computes accurate aggregates from persisted records", async () => {
      vi.mocked(prisma.workoutSession.count).mockResolvedValue(5);
      vi.mocked(prisma.workoutSession.aggregate).mockResolvedValue({
        _sum: {
          durationSeconds: 4500,
          workoutCalories: 600,
        },
      } as never);
      vi.mocked(prisma.workoutSession.findFirst).mockResolvedValue(mockSessionUserA as never);
      vi.mocked(prisma.workoutSession.findMany).mockResolvedValue([
        {
          ...mockSessionUserA,
          status: "COMPLETED",
          endedAt: new Date(),
        },
      ] as never);

      const res = await request(app)
        .get("/api/v1/sessions/summary")
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalWorkoutsCompleted).toBe(5);
      expect(res.body.data.totalDurationSeconds).toBe(4500);
      expect(res.body.data.totalCaloriesBurned).toBe(600);
      expect(res.body.data.activeSession).not.toBeNull();
      expect(res.body.data.recentSessions).toHaveLength(1);
    });
  });
});
