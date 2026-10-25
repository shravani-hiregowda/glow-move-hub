import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../app";
import { prisma } from "../db/client";
import { env } from "../config/env";

// Mock prisma methods
vi.mock("../db/client", () => {
  return {
    prisma: {
      $queryRaw: vi.fn(),
      $transaction: vi.fn(),
      workout: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      workoutStep: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      $disconnect: vi.fn(),
    },
    checkDatabaseConnection: vi.fn(),
    disconnectDatabase: vi.fn(),
  };
});

describe("JERAI FIT API — Endpoints and Security Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/health", () => {
    it("returns 200 and healthy status when database is reachable", async () => {
      const { checkDatabaseConnection } = await import("../db/client");
      vi.mocked(checkDatabaseConnection).mockResolvedValue(true);

      const res = await request(app).get("/api/v1/health");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.service).toBe("jerai-fit-api");
      expect(res.body.database.connected).toBe(true);
      expect(res.body.timestamp).toBeDefined();
    });

    it("returns 503 and degraded status when database is unreachable", async () => {
      const { checkDatabaseConnection } = await import("../db/client");
      vi.mocked(checkDatabaseConnection).mockResolvedValue(false);

      const res = await request(app).get("/api/v1/health");

      expect(res.status).toBe(503);
      expect(res.body.status).toBe("degraded");
      expect(res.body.database.connected).toBe(false);
      expect(res.body.database.error).toBe("Database connection failed");
    });
  });

  describe("GET /api/v1/workouts", () => {
    it("returns list of workouts with pagination metadata", async () => {
      const mockWorkouts = [
        {
          id: "w-1",
          title: "Bench Press",
          description: "Heavy chest workout",
          difficulty: "Intermediate",
          bodyPart: "Chest",
          duration: "25 min",
          calories: 200,
          videoUrl: "https://example.com/video",
          image: "/assets/workout-1.jpg",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          steps: [
            { id: "s-1", stepOrder: 1, instruction: "Lie flat on bench" },
            { id: "s-2", stepOrder: 2, instruction: "Press barbell" },
          ],
        },
      ];

      vi.mocked(prisma.workout.count).mockResolvedValue(1);
      vi.mocked(prisma.workout.findMany).mockResolvedValue(mockWorkouts as never);

      const res = await request(app).get("/api/v1/workouts?page=1&limit=10");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe("Bench Press");
      expect(res.body.data[0].steps).toEqual(["Lie flat on bench", "Press barbell"]);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it("applies bodyPart and search filters correctly", async () => {
      vi.mocked(prisma.workout.count).mockResolvedValue(0);
      vi.mocked(prisma.workout.findMany).mockResolvedValue([]);

      const res = await request(app).get("/api/v1/workouts?bodyPart=Chest&search=pushup");

      expect(res.status).toBe(200);
      expect(prisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            bodyPart: { equals: "Chest", mode: "insensitive" },
            OR: [
              { title: { contains: "pushup", mode: "insensitive" } },
              { description: { contains: "pushup", mode: "insensitive" } },
            ],
          }),
        })
      );
    });

    it("returns 400 when query parameter validation fails", async () => {
      const res = await request(app).get("/api/v1/workouts?limit=999"); // max 100
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/v1/workouts/:id", () => {
    it("returns 200 with workout when ID exists", async () => {
      const mockWorkout = {
        id: "w-1",
        title: "Push-Up Power",
        description: "Classic chest workout",
        difficulty: "Beginner",
        bodyPart: "Chest",
        duration: "15 min",
        calories: 120,
        videoUrl: "https://example.com/video",
        image: "/assets/workout-1.jpg",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        steps: [{ id: "s-1", stepOrder: 1, instruction: "Push up" }],
      };

      vi.mocked(prisma.workout.findUnique).mockResolvedValue(mockWorkout as never);

      const res = await request(app).get("/api/v1/workouts/w-1");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe("w-1");
      expect(res.body.data.steps).toEqual(["Push up"]);
    });

    it("returns 404 when workout ID is not found", async () => {
      vi.mocked(prisma.workout.findUnique).mockResolvedValue(null);

      const res = await request(app).get("/api/v1/workouts/non-existent-id");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Write Access Security Guard (Fail-Closed)", () => {
    it("denies POST /api/v1/workouts with 403 when ALLOW_LOCAL_DEV_WRITES is false", async () => {
      // Default test env has ALLOW_LOCAL_DEV_WRITES = false
      const res = await request(app)
        .post("/api/v1/workouts")
        .send({
          title: "Test Workout",
          description: "Test Desc",
          difficulty: "Beginner",
          bodyPart: "Chest",
          duration: "10 min",
          calories: 100,
          videoUrl: "",
          image: "/assets/workout-1.jpg",
          steps: ["Step 1"],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("WRITES_DISABLED");
    });

    it("denies PUT /api/v1/workouts/:id with 403 when guard is closed", async () => {
      const res = await request(app)
        .put("/api/v1/workouts/w-1")
        .send({ title: "Updated Title" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("WRITES_DISABLED");
    });

    it("denies DELETE /api/v1/workouts/:id with 403 when guard is closed", async () => {
      const res = await request(app).delete("/api/v1/workouts/w-1");

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("WRITES_DISABLED");
    });

    it("allows write operations when ALLOW_LOCAL_DEV_WRITES is true in non-production", async () => {
      const originalFlag = env.ALLOW_LOCAL_DEV_WRITES;
      const mutableEnv = env as { NODE_ENV: string; ALLOW_LOCAL_DEV_WRITES: boolean };
      mutableEnv.ALLOW_LOCAL_DEV_WRITES = true;

      const mockCreated = {
        id: "w-new",
        title: "New Workout",
        description: "New Desc",
        difficulty: "Beginner",
        bodyPart: "Chest",
        duration: "10 min",
        calories: 100,
        videoUrl: "",
        image: "/assets/workout-1.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
        steps: [{ id: "s-1", stepOrder: 1, instruction: "First step" }],
      };

      vi.mocked(prisma.workout.create).mockResolvedValue(mockCreated as never);

      const res = await request(app)
        .post("/api/v1/workouts")
        .send({
          title: "New Workout",
          description: "New Desc",
          difficulty: "Beginner",
          bodyPart: "Chest",
          duration: "10 min",
          calories: 100,
          videoUrl: "",
          image: "/assets/workout-1.jpg",
          steps: ["First step"],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe("w-new");

      mutableEnv.ALLOW_LOCAL_DEV_WRITES = originalFlag;
    });

    it("refuses writes in production even if ALLOW_LOCAL_DEV_WRITES was somehow set", async () => {
      const originalEnv = env.NODE_ENV;
      const originalFlag = env.ALLOW_LOCAL_DEV_WRITES;
      const mutableEnv = env as { NODE_ENV: string; ALLOW_LOCAL_DEV_WRITES: boolean };
      mutableEnv.NODE_ENV = "production";
      mutableEnv.ALLOW_LOCAL_DEV_WRITES = true;

      const res = await request(app)
        .delete("/api/v1/workouts/w-1");

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("WRITES_DISABLED_PRODUCTION");

      mutableEnv.NODE_ENV = originalEnv;
      mutableEnv.ALLOW_LOCAL_DEV_WRITES = originalFlag;
    });
  });

  describe("Safe Error Handling", () => {
    it("handles database errors without exposing stack traces or internals", async () => {
      vi.mocked(prisma.workout.count).mockRejectedValue(new Error("Connection terminated unexpectedly"));

      const res = await request(app).get("/api/v1/workouts");

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INTERNAL_SERVER_ERROR");
      expect(res.body.error.message).toBe("An unexpected internal server error occurred.");
      expect(res.body.stack).toBeUndefined();
    });

    it("returns 404 for unmatched routes", async () => {
      const res = await request(app).get("/api/v1/unknown-endpoint");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
    });
  });
});
