import { env } from "../../config/env";
import { IStorageService } from "./storage.interface";
import { LocalStorageService } from "./local-storage.service";
import { S3StorageService } from "./s3-storage.service";

export * from "./storage.interface";
export * from "./local-storage.service";
export * from "./s3-storage.service";

let storageInstance: IStorageService | null = null;

export function getStorageService(): IStorageService {
  if (storageInstance) {
    return storageInstance;
  }

  const driver = env.STORAGE_DRIVER;

  if (driver === "s3" || driver === "r2") {
    if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      console.warn(
        `[Storage] Driver '${driver}' requested, but required credentials (S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY) are missing. Falling back safely to LocalStorageService.`
      );
      storageInstance = new LocalStorageService(env.STORAGE_LOCAL_DIR);
      return storageInstance;
    }

    storageInstance = new S3StorageService({
      providerName: driver,
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      bucket: env.S3_BUCKET,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      publicUrlPrefix: env.S3_PUBLIC_URL_PREFIX,
    });
    return storageInstance;
  }

  // Default to local filesystem storage
  storageInstance = new LocalStorageService(env.STORAGE_LOCAL_DIR);
  return storageInstance;
}

/**
 * Resets the storage singleton instance (useful for test isolation).
 */
export function resetStorageService(): void {
  storageInstance = null;
}
