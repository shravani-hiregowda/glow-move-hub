import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../app";
import { prisma } from "../db/client";
import { hashPassword } from "../utils/password";
import {
  SESSION_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  hashSessionToken,
} from "../utils/session";

// Mock prisma methods
vi.mock("../db/client", () => {
  return {
    prisma: {
      $queryRaw: vi.fn(),
      $transaction: vi.fn(),
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      session: {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
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

function getCookies(res: request.Response): string[] {
  const raw = res.headers["set-cookie"];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

const mockUserCreate = prisma.user.create as unknown as ReturnType<typeof vi.fn>;

describe("JERAI FIT API — Authentication & Security Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/auth/register", () => {
    it("successfully creates a MEMBER with an Argon2id hash (never plaintext) and sets HttpOnly cookie", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      mockUserCreate.mockImplementation(async (args: { data: { email: string; passwordHash: string; role: "MEMBER" | "ADMIN" } }) => {
        const data = args.data;
        expect(data.passwordHash).not.toBe("SuperSecret123!");
        expect(data.passwordHash).toMatch(/^\$argon2id\$/); // Must be Argon2id hash
        expect(data.role).toBe("MEMBER"); // Always member
        return {
          id: "u-123",
          email: data.email,
          role: data.role,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });
      vi.mocked(prisma.session.create).mockResolvedValue({} as never);

      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "  NewUser@Example.COM  ",
          password: "SuperSecret123!",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe("newuser@example.com");
      expect(res.body.data.user.role).toBe("MEMBER");
      expect(res.body.data.user.passwordHash).toBeUndefined();

      // Check cookies
      const cookies = getCookies(res);
      expect(cookies.length).toBeGreaterThan(0);
      const sessionCookie = cookies.find((c: string) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain("HttpOnly");
      expect(sessionCookie).toContain("SameSite=Lax");
    });

    it("strictly prevents public registration from setting ADMIN role", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      mockUserCreate.mockImplementation(async (args: { data: { role: string } }) => {
        const data = args.data;
        expect(data.role).toBe("MEMBER");
        return {
          id: "u-hack",
          email: "hack@example.com",
          role: "MEMBER",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });
      vi.mocked(prisma.session.create).mockResolvedValue({} as never);


      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "hack@example.com",
          password: "SuperSecret123!",
          role: "ADMIN", // Malicious attempt to elevate privileges
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe("MEMBER");
    });

    it("rejects duplicate registration safely without unhandled error (409 CONFLICT)", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u-existing",
        email: "existing@example.com",
        passwordHash: "hash",
        role: "MEMBER",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "existing@example.com",
          password: "ValidPassword123!",
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("EMAIL_ALREADY_REGISTERED");
    });

    it("rejects passwords shorter than 8 characters", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "test@example.com",
          password: "short",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("authenticates valid credentials, rotates session, and sets cookies", async () => {
      const password = "AdminPassword123!";
      const realHash = await hashPassword(password);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u-admin",
        email: "admin@example.com",
        passwordHash: realHash,
        role: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
      vi.mocked(prisma.session.create).mockResolvedValue({} as never);
      vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 1 } as never);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("Cookie", [`${SESSION_COOKIE_NAME}=old-session-token`])
        .send({
          email: "  Admin@Example.com  ",
          password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe("admin@example.com");
      expect(res.body.data.user.role).toBe("ADMIN");
      expect(res.body.data.user.passwordHash).toBeUndefined();

      // Verify old session was deleted (session rotation)
      expect(prisma.session.deleteMany).toHaveBeenCalled();

      // Check cookie headers
      const cookies = getCookies(res);
      expect(cookies.length).toBeGreaterThan(0);
      const sessionCookie = cookies.find(
        (c: string) => c.startsWith(`${SESSION_COOKIE_NAME}=`) && !c.includes(`${SESSION_COOKIE_NAME}=;`)
      );
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain("HttpOnly");
      expect(sessionCookie).toContain("SameSite=Lax");
    });

    it("returns generic 401 when account does not exist without leaking account presence", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "SomePassword123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
      expect(res.body.error.message).toBe("Invalid email or password.");
    });

    it("returns generic 401 when password does not match", async () => {
      const realHash = await hashPassword("CorrectPass123!");

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u-user",
        email: "user@example.com",
        passwordHash: realHash,
        role: "MEMBER",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "user@example.com",
          password: "WrongPassword!",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
      expect(res.body.error.message).toBe("Invalid email or password.");
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("returns authenticated user without sensitive fields", async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);
      vi.mocked(prisma.session.findUnique).mockResolvedValue({
        id: "sess-1",
        userId: "u-1",
        tokenHash: hashSessionToken("valid-token"),
        expiresAt: futureDate,
        createdAt: new Date(),
        user: {
          id: "u-1",
          email: "user@example.com",
          role: "MEMBER",
        },
      } as never);

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", [`${SESSION_COOKIE_NAME}=valid-token`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toEqual({
        id: "u-1",
        email: "user@example.com",
        role: "MEMBER",
      });
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it("returns 401 when no session cookie is provided", async () => {
      const res = await request(app).get("/api/v1/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 and clears cookie when session is expired", async () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // Expired 1 hour ago
      vi.mocked(prisma.session.findUnique).mockResolvedValue({
        id: "sess-expired",
        userId: "u-1",
        tokenHash: hashSessionToken("expired-token"),
        expiresAt: pastDate,
        createdAt: new Date(),
        user: {
          id: "u-1",
          email: "user@example.com",
          role: "MEMBER",
        },
      } as never);
      vi.mocked(prisma.session.delete).mockResolvedValue({} as never);

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", [`${SESSION_COOKIE_NAME}=expired-token`]);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("revokes session in database and clears session cookies", async () => {
      vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 1 } as never);

      const res = await request(app)
        .post("/api/v1/auth/logout")
        .set("Cookie", [`${SESSION_COOKIE_NAME}=active-token`, `${CSRF_COOKIE_NAME}=csrf-tok`])
        .set("x-csrf-token", "csrf-tok");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.session.deleteMany).toHaveBeenCalled();

      // Check cookies cleared
      const cookies = getCookies(res);
      expect(cookies.length).toBeGreaterThan(0);
      const clearedSession = cookies.find((c: string) => c.includes(`${SESSION_COOKIE_NAME}=;`));
      expect(clearedSession).toBeDefined();
    });
  });

  describe("CSRF and Cross-Origin Protection", () => {
    it("rejects state-changing requests with untrusted Origin header", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("Origin", "https://malicious-attacker-site.com")
        .send({
          email: "admin@example.com",
          password: "AnyPassword123!",
        });

      expect(res.status).toBe(403);
      expect(["CORS_FORBIDDEN", "CSRF_ORIGIN_INVALID"]).toContain(res.body.error.code);
    });

    it("rejects state-changing requests with untrusted Referer header", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("Referer", "https://malicious-attacker-site.com/attack")
        .send({
          email: "admin@example.com",
          password: "AnyPassword123!",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("CSRF_ORIGIN_INVALID");
    });


    it("rejects cookie-authenticated mutation when CSRF token is missing", async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);
      vi.mocked(prisma.session.findUnique).mockResolvedValue({
        id: "sess-1",
        userId: "u-1",
        tokenHash: hashSessionToken("valid-token"),
        expiresAt: futureDate,
        createdAt: new Date(),
        user: { id: "u-1", email: "user@example.com", role: "ADMIN" },
      } as never);

      const res = await request(app)
        .post("/api/v1/workouts")
        .set("Cookie", [`${SESSION_COOKIE_NAME}=valid-token`]) // Has session cookie but missing x-csrf-token
        .send({ title: "Hack Workout" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("CSRF_TOKEN_MISSING");
    });

    it("rejects cookie-authenticated mutation when CSRF token mismatches cookie", async () => {
      const res = await request(app)
        .post("/api/v1/workouts")
        .set("Cookie", [`${SESSION_COOKIE_NAME}=valid-token`, `${CSRF_COOKIE_NAME}=real-token`])
        .set("x-csrf-token", "forged-token")
        .send({ title: "Hack Workout" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("CSRF_TOKEN_INVALID");
    });
  });

  describe("Admin Bootstrap Mechanism", () => {
    it("creates an administrator with Argon2id hash when valid env vars are supplied", async () => {
      const { bootstrapAdmin } = await import("../scripts/bootstrap-admin");
      process.env.ADMIN_EMAIL = "bootstrap.admin@example.com";
      process.env.ADMIN_PASSWORD = "BootstrapSecret123!";

      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      mockUserCreate.mockImplementation(async (args: { data: { email: string; passwordHash: string; role: string } }) => {
        const data = args.data;
        expect(data.email).toBe("bootstrap.admin@example.com");
        expect(data.role).toBe("ADMIN");
        expect(data.passwordHash).not.toBe("BootstrapSecret123!");
        expect(data.passwordHash).toMatch(/^\$argon2id\$/);
        return {
          id: "u-bootstrap-admin",
          email: data.email,
          role: "ADMIN",
        };
      });

      await bootstrapAdmin();
      expect(prisma.user.create).toHaveBeenCalled();

      delete process.env.ADMIN_EMAIL;
      delete process.env.ADMIN_PASSWORD;
    });

    it("refuses to overwrite when an administrator already exists", async () => {
      const { bootstrapAdmin } = await import("../scripts/bootstrap-admin");
      process.env.ADMIN_EMAIL = "new.admin@example.com";
      process.env.ADMIN_PASSWORD = "NewPassword123!";

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "u-existing-admin",
        email: "existing.admin@example.com",
        role: "ADMIN",
      } as never);

      await bootstrapAdmin();
      expect(prisma.user.create).not.toHaveBeenCalled();

      delete process.env.ADMIN_EMAIL;
      delete process.env.ADMIN_PASSWORD;
    });

    it("supports passing options directly to bootstrapAdmin without environment variable exposure", async () => {
      const { bootstrapAdmin } = await import("../scripts/bootstrap-admin");
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      mockUserCreate.mockResolvedValueOnce({
        id: "u-direct-admin",
        email: "direct.admin@example.com",
        role: "ADMIN",
      } as never);

      await bootstrapAdmin({
        email: "direct.admin@example.com",
        password: "DirectSecurePass123!",
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "direct.admin@example.com",
            role: "ADMIN",
          }),
        })
      );
    });
  });
});
