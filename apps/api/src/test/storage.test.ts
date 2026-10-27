import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { LocalStorageService } from "../services/storage/local-storage.service";
import { S3StorageService } from "../services/storage/s3-storage.service";
import { getStorageService, resetStorageService } from "../services/storage";

describe("Object Storage Adapter Tests", () => {
  let tempDir: string;
  let storage: LocalStorageService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "jerai-storage-test-"));
    storage = new LocalStorageService(tempDir);
    resetStorageService();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe("LocalStorageService", () => {
    it("successfully uploads, verifies, and retrieves an object", async () => {
      const key = "workouts/test-image.webp";
      const buffer = Buffer.from("RIFF\x20\x00\x00\x00WEBPVP8 \x14\x00\x00\x00mock-webp-payload", "binary");
      const mimeType = "image/webp";

      const putResult = await storage.putObject(key, buffer, mimeType);
      expect(putResult.key).toBe(key);
      expect(putResult.size).toBe(buffer.length);
      expect(putResult.mimeType).toBe(mimeType);
      expect(putResult.checksum).toBeDefined();

      const exists = await storage.objectExists(key);
      expect(exists).toBe(true);

      const getResult = await storage.getObject(key);
      expect(getResult).not.toBeNull();
      expect(getResult?.buffer.equals(buffer)).toBe(true);
      expect(getResult?.size).toBe(buffer.length);
      expect(getResult?.checksum).toBe(putResult.checksum);
    });

    it("returns null when attempting to retrieve a nonexistent object", async () => {
      const getResult = await storage.getObject("workouts/does-not-exist.jpg");
      expect(getResult).toBeNull();

      const exists = await storage.objectExists("workouts/does-not-exist.jpg");
      expect(exists).toBe(false);
    });

    it("deletes an object idempotently", async () => {
      const key = "workouts/delete-me.png";
      const buffer = Buffer.from("dummy-png-data");
      await storage.putObject(key, buffer, "image/png");

      expect(await storage.objectExists(key)).toBe(true);

      await storage.deleteObject(key);
      expect(await storage.objectExists(key)).toBe(false);

      // Deleting again should be idempotent and not throw
      await expect(storage.deleteObject(key)).resolves.not.toThrow();
    });

    it("strictly prevents path traversal attacks outside the storage root", async () => {
      const maliciousKeys = [
        "../../outside.txt",
        "..\\..\\outside.txt",
        "/etc/passwd",
        "nested/../../../secret.txt",
      ];

      for (const key of maliciousKeys) {
        await expect(
          storage.putObject(key, Buffer.from("attack"), "text/plain")
        ).rejects.toThrow(/Path traversal denied/);

        await expect(storage.getObject(key)).rejects.toThrow(/Path traversal denied/);
        await expect(storage.deleteObject(key)).rejects.toThrow(/Path traversal denied/);
      }
    });

    it("generates normalized public retrieval URLs with forward slashes", () => {
      const url = storage.getPublicUrl("workouts\\migrated-123.jpg");
      expect(url).toBe("/api/v1/media/file/workouts/migrated-123.jpg");
    });
  });

  describe("S3StorageService Configuration & Safety", () => {
    it("fails safely when required S3 credentials or bucket are missing", () => {
      expect(() => {
        new S3StorageService({
          bucket: "",
          accessKeyId: "test-key",
          secretAccessKey: "test-secret",
        });
      }).toThrow(/bucket is required/);

      expect(() => {
        new S3StorageService({
          bucket: "my-bucket",
          accessKeyId: "",
          secretAccessKey: "",
        });
      }).toThrow(/accessKeyId and secretAccessKey are required/);
    });

    it("returns public URL with custom prefix when configured", () => {
      const s3 = new S3StorageService({
        bucket: "test-bucket",
        accessKeyId: "mock-id",
        secretAccessKey: "mock-secret",
        publicUrlPrefix: "https://media.jeraifit.com",
      });

      const url = s3.getPublicUrl("workouts/banner.webp");
      expect(url).toBe("https://media.jeraifit.com/workouts/banner.webp");
    });
  });
});
