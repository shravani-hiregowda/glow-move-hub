import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {
  IStorageService,
  StoragePutResult,
  StorageGetResult,
} from "./storage.interface";

export class LocalStorageService implements IStorageService {
  private readonly baseDir: string;

  constructor(baseDir: string = "uploads") {
    this.baseDir = path.resolve(process.cwd(), baseDir);
  }

  getProviderName(): string {
    return "local";
  }

  getBaseDir(): string {
    return this.baseDir;
  }

  /**
   * Safely resolves and validates that a given object key stays within the base storage directory.
   * Prevents path-traversal attacks (e.g., ../../etc/passwd or Windows drive paths).
   */
  private resolveSafePath(key: string): string {
    if (!key || typeof key !== "string") {
      throw new Error("Invalid object key: key must be a non-empty string");
    }

    // Explicitly deny absolute paths, leading slashes, and parent-directory traversal
    if (
      key.startsWith("/") ||
      key.startsWith("\\") ||
      path.isAbsolute(key) ||
      key.includes("..")
    ) {
      throw new Error(`Path traversal denied: key '${key}' escapes storage directory`);
    }

    const resolved = path.resolve(this.baseDir, key);
    const relative = path.relative(this.baseDir, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`Path traversal denied: key '${key}' escapes storage directory`);
    }

    return resolved;
  }

  async putObject(
    key: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<StoragePutResult> {
    const targetPath = this.resolveSafePath(key);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    // Compute cryptographic checksum
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

    // Write file to target path
    await fs.writeFile(targetPath, buffer);

    // Verify written file byte length on disk
    const stat = await fs.stat(targetPath);
    if (stat.size !== buffer.length) {
      await fs.unlink(targetPath).catch(() => {});
      throw new Error(
        `Storage verification failed: written file size (${stat.size}) does not match expected size (${buffer.length})`
      );
    }

    return {
      key,
      size: buffer.length,
      checksum,
      mimeType,
    };
  }

  async getObject(key: string): Promise<StorageGetResult | null> {
    const targetPath = this.resolveSafePath(key);
    try {
      const buffer = await fs.readFile(targetPath);
      const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
      const ext = path.extname(key).toLowerCase();

      let mimeType = "application/octet-stream";
      if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
      else if (ext === ".png") mimeType = "image/png";
      else if (ext === ".webp") mimeType = "image/webp";

      return {
        buffer,
        mimeType,
        size: buffer.length,
        checksum,
      };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "ENOENT") {
        return null;
      }
      throw err;
    }
  }

  async deleteObject(key: string): Promise<void> {
    const targetPath = this.resolveSafePath(key);
    try {
      await fs.unlink(targetPath);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "ENOENT") {
        return; // Idempotent deletion
      }
      throw err;
    }
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      const targetPath = this.resolveSafePath(key);
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(key: string): string {
    // Normalizes forward slashes for URL path
    const normalizedKey = key.replace(/\\/g, "/");
    return `/api/v1/media/file/${normalizedKey}`;
  }
}
