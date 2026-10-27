import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../app";
import { prisma } from "../db/client";
import { getStorageService } from "../services/storage";
import {
  SESSION_COOKIE_NAME,
  CSRF_COOKIE_NAME,
} from "../utils/session";

// Mock prisma client for unit/API isolation
vi.mock("../db/client", () => {
  return {
    prisma: {
      $transaction: vi.fn(),
      user: {
        findUnique: vi.fn(),
      },
      session: {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
      workout: {
        findUnique: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      workoutStep: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      media: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      $queryRaw: vi.fn(),
      $disconnect: vi.fn(),
    },
    checkDatabaseConnection: vi.fn(),
    disconnectDatabase: vi.fn(),
  };
});

describe("Media API & Security Endpoints", () => {
  const validWebpBuffer = Buffer.from(
    "RIFF\x20\x00\x00\x00WEBPVP8 \x14\x00\x00\x00" + "\x00".repeat(30),
    "binary"
  );

  const mockAdminSession = {
    id: "sess-admin",
    userId: "u-admin",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    user: {
      id: "u-admin",
      email: "admin@example.com",
      role: "ADMIN" as const,
    },
  };

  const mockMemberSession = {
    id: "sess-member",
    userId: "u-member",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    user: {
      id: "u-member",
      email: "member@example.com",
      role: "MEMBER" as const,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/media/upload — Authorization & Role Enforcement", () => {
    it("returns 401 Unauthorized when request is unauthenticated (anonymous)", async () => {
      const res = await request(app)
        .post("/api/v1/media/upload")
        .attach("file", validWebpBuffer, "workout.webp");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 Forbidden when authenticated as MEMBER", async () => {
      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockMemberSession as never);

      const res = await request(app)
        .post("/api/v1/media/upload")
        .set("Cookie", [`${SESSION_COOKIE_NAME}=member-tok`, `${CSRF_COOKIE_NAME}=csrf-tok`])
        .set("x-csrf-token", "csrf-tok")
        .attach("file", validWebpBuffer, "workout.webp");

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("allows ADMIN to upload a valid image with server-controlled collision-safe key", async () => {
      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockAdminSession as never);

      const mockCreatedMedia = {
        id: "media-uuid-1",
        workoutId: null,
        provider: "local",
        objectKey: "workouts/migrated-test.webp",
        url: "/api/v1/media/file/workouts/migrated-test.webp",
        mimeType: "image/webp",
        fileSize: validWebpBuffer.length,
        checksum: "abc123mockchecksum",
        width: 100,
        height: 100,
        originalName: "malicious-name.webp",
        legacySource: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: unknown) => {
        return (callback as (tx: unknown) => Promise<unknown>)({
          media: {
            create: vi.fn().mockResolvedValue(mockCreatedMedia),
          },
          workout: {
            update: vi.fn(),
          },
        });
      });

      const res = await request(app)
        .post("/api/v1/media/upload")
        .set("Cookie", [`${SESSION_COOKIE_NAME}=admin-tok`, `${CSRF_COOKIE_NAME}=csrf-tok`])
        .set("x-csrf-token", "csrf-tok")
        .attach("file", validWebpBuffer, "malicious-name.webp");

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe("media-uuid-1");
      expect(res.body.data.url).toMatch(/^\/api\/v1\/media\//);
    });
  });

  describe("POST /api/v1/media/upload — File Inspection & Validation", () => {
    it("rejects request when no file is uploaded", async () => {
      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockAdminSession as never);

      const res = await request(app)
        .post("/api/v1/media/upload")
        .set("Cookie", [`${SESSION_COOKIE_NAME}=admin-tok`, `${CSRF_COOKIE_NAME}=csrf-tok`])
        .set("x-csrf-token", "csrf-tok");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects file with invalid magic bytes / spoofed extension (e.g. text file renamed to .jpg)", async () => {
      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockAdminSession as never);

      const fakeJpg = Buffer.from("THIS IS A TEXT FILE NOT AN IMAGE");

      const res = await request(app)
        .post("/api/v1/media/upload")
        .set("Cookie", [`${SESSION_COOKIE_NAME}=admin-tok`, `${CSRF_COOKIE_NAME}=csrf-tok`])
        .set("x-csrf-token", "csrf-tok")
        .attach("file", fakeJpg, "fake.jpg");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_MEDIA");
      expect(res.body.error.message).toMatch(/signature/i);
    });

    it("rejects upload if database update fails and safely cleans up storage object", async () => {
      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockAdminSession as never);

      const storage = getStorageService();
      const deleteSpy = vi.spyOn(storage, "deleteObject");

      vi.mocked(prisma.$transaction).mockRejectedValue(new Error("Database connection dropped"));

      const res = await request(app)
        .post("/api/v1/media/upload")
        .set("Cookie", [`${SESSION_COOKIE_NAME}=admin-tok`, `${CSRF_COOKIE_NAME}=csrf-tok`])
        .set("x-csrf-token", "csrf-tok")
        .attach("file", validWebpBuffer, "workout.webp");

      expect(res.status).toBe(500);
      expect(deleteSpy).toHaveBeenCalled();
    });
  });

  describe("GET /api/v1/media/:id — Retrieval & Caching", () => {
    it("returns 404 if media is not found in database", async () => {
      vi.mocked(prisma.media.findUnique).mockResolvedValue(null);

      const res = await request(app).get("/api/v1/media/non-existent-id");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("returns 200 with proper headers when media exists", async () => {
      const storage = getStorageService();
      const key = "workouts/sample.webp";
      await storage.putObject(key, validWebpBuffer, "image/webp");

      vi.mocked(prisma.media.findUnique).mockResolvedValue({
        id: "media-1",
        workoutId: "w-1",
        provider: "local",
        objectKey: key,
        url: `/api/v1/media/file/${key}`,
        mimeType: "image/webp",
        fileSize: validWebpBuffer.length,
        checksum: "mock-checksum-123",
        width: 100,
        height: 100,
        originalName: "test.webp",
        legacySource: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const res = await request(app).get("/api/v1/media/media-1");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("image/webp");
      expect(res.headers["cache-control"]).toContain("public");
      expect(res.headers["etag"]).toBe('"mock-checksum-123"');
    });
  });

  describe("DELETE /api/v1/media/:id — Deletion & Safe Rollback", () => {
    it("returns 401 when anonymous user attempts to delete media", async () => {
      const res = await request(app).delete("/api/v1/media/some-id");
      expect(res.status).toBe(401);
    });

    it("returns 403 when MEMBER attempts to delete media", async () => {
      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockMemberSession as never);

      const res = await request(app)
        .delete("/api/v1/media/some-id")
        .set("Cookie", [`${SESSION_COOKIE_NAME}=member-tok`, `${CSRF_COOKIE_NAME}=csrf-tok`])
        .set("x-csrf-token", "csrf-tok");

      expect(res.status).toBe(403);
    });

    it("allows ADMIN to delete media, deletes object from storage, and restores legacy source", async () => {
      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockAdminSession as never);

      const key = "workouts/to-delete.webp";
      const storage = getStorageService();
      await storage.putObject(key, validWebpBuffer, "image/webp");

      vi.mocked(prisma.media.findUnique).mockResolvedValue({
        id: "media-del",
        workoutId: "w-del",
        provider: "local",
        objectKey: key,
        url: `/api/v1/media/file/${key}`,
        mimeType: "image/webp",
        fileSize: validWebpBuffer.length,
        checksum: "checksum",
        legacySource: "/assets/workout-old.jpg",
      } as never);

      vi.mocked(prisma.workout.findUnique).mockResolvedValue({
        id: "w-del",
        image: `/api/v1/media/file/${key}`,
      } as never);

      vi.mocked(prisma.workout.update).mockResolvedValue({} as never);
      vi.mocked(prisma.media.delete).mockResolvedValue({} as never);

      const res = await request(app)
        .delete("/api/v1/media/media-del")
        .set("Cookie", [`${SESSION_COOKIE_NAME}=admin-tok`, `${CSRF_COOKIE_NAME}=csrf-tok`])
        .set("x-csrf-token", "csrf-tok");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify legacy source restored
      expect(prisma.workout.update).toHaveBeenCalledWith({
        where: { id: "w-del" },
        data: { image: "/assets/workout-old.jpg" },
      });

      // Verify record deleted
      expect(prisma.media.delete).toHaveBeenCalledWith({
        where: { id: "media-del" },
      });
    });
  });
});
