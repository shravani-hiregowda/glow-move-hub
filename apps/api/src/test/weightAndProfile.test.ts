import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../app";
import { prisma } from "../db/client";
import { hashSessionToken } from "../utils/session";

vi.mock("../db/client", () => {
  return {
    prisma: {
      $queryRaw: vi.fn(),
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      session: {
        findUnique: vi.fn(),
      },
      weightLog: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
    },
    checkDatabaseConnection: vi.fn(),
    disconnectDatabase: vi.fn(),
  };
});

describe("Interactive User State, Role Switching & Weight API", () => {
  const dummyToken = "session-token-test-123";
  const dummyCsrf = "csrf-token-test-123";
  const mockUser = {
    id: "user-kiran-1",
    name: "Kiran",
    email: "kiran@jeraifit.com",
    role: "MEMBER" as const,
    targetWeight: 70.0,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default authenticated session setup
    (prisma.session.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "sess-1",
      tokenHash: hashSessionToken(dummyToken),
      userId: mockUser.id,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      user: mockUser,
    });
  });

  const authCookie = `jerai_session=${dummyToken}; jerai_csrf=${dummyCsrf}`;
  const authHeaders = {
    Cookie: authCookie,
    "x-csrf-token": dummyCsrf,
  };

  describe("PATCH /api/v1/auth/profile", () => {
    it("updates full name and target weight for authenticated user", async () => {
      (prisma.user.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockUser,
        name: "Kiran V.",
        targetWeight: 68.5,
      });

      const res = await request(app)
        .patch("/api/v1/auth/profile")
        .set(authHeaders)
        .send({ name: "Kiran V.", targetWeight: 68.5 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe("Kiran V.");
      expect(res.body.data.user.targetWeight).toBe(68.5);
    });

    it("rejects unauthenticated requests with 401", async () => {
      const res = await request(app)
        .patch("/api/v1/auth/profile")
        .send({ name: "Hacker" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/switch-role", () => {
    it("switches user role between MEMBER and ADMIN dynamically", async () => {
      (prisma.user.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockUser,
        role: "ADMIN",
      });

      const res = await request(app)
        .post("/api/v1/auth/switch-role")
        .set(authHeaders)
        .send({ role: "ADMIN" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe("ADMIN");
      expect(res.body.data.message).toContain("ADMIN");
    });

    it("rejects invalid role requests with 400", async () => {
      const res = await request(app)
        .post("/api/v1/auth/switch-role")
        .set(authHeaders)
        .send({ role: "SUPERUSER" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Weight Tracker API (/api/v1/weight-logs)", () => {
    it("GET /api/v1/weight-logs returns list of logs for authenticated user", async () => {
      const mockLogs = [
        {
          id: "w-1",
          userId: mockUser.id,
          weight: 74.0,
          note: "Initial weigh-in",
          loggedAt: new Date("2026-10-01T08:00:00Z"),
          createdAt: new Date("2026-10-01T08:00:00Z"),
        },
      ];
      (prisma.weightLog.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockLogs);

      const res = await request(app)
        .get("/api/v1/weight-logs")
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].weight).toBe(74.0);
    });

    it("POST /api/v1/weight-logs creates a valid entry", async () => {
      (prisma.weightLog.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "w-2",
        userId: mockUser.id,
        weight: 73.2,
        note: "Post-workout",
        loggedAt: new Date(),
        createdAt: new Date(),
      });

      const res = await request(app)
        .post("/api/v1/weight-logs")
        .set(authHeaders)
        .send({ weight: 73.2, note: "Post-workout" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.weight).toBe(73.2);
    });

    it("POST /api/v1/weight-logs rejects out-of-range weights (<20kg or >500kg)", async () => {
      const res = await request(app)
        .post("/api/v1/weight-logs")
        .set(authHeaders)
        .send({ weight: 5 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("DELETE /api/v1/weight-logs/:id deletes owned entry", async () => {
      (prisma.weightLog.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "w-2",
        userId: mockUser.id,
      });
      (prisma.weightLog.delete as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "w-2",
      });

      const res = await request(app)
        .delete("/api/v1/weight-logs/w-2")
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
