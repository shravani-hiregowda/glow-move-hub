export interface StoragePutResult {
  key: string;
  size: number;
  checksum: string;
  mimeType: string;
}

export interface StorageGetResult {
  buffer: Buffer;
  mimeType: string;
  size: number;
  checksum: string;
}

export interface IStorageService {
  /**
   * Identifies the current storage provider (e.g. 'local', 'r2', 's3').
   */
  getProviderName(): string;

  /**
   * Upload an object to storage and verify its stored integrity.
   */
  putObject(key: string, buffer: Buffer, mimeType: string): Promise<StoragePutResult>;

  /**
   * Retrieve an object's contents from storage. Returns null if not found.
   */
  getObject(key: string): Promise<StorageGetResult | null>;

  /**
   * Delete an object from storage idempotently.
   */
  deleteObject(key: string): Promise<void>;

  /**
   * Verify whether an object exists in storage.
   */
  objectExists(key: string): Promise<boolean>;

  /**
   * Returns a retrieval URL for an object key.
   */
  getPublicUrl(key: string): string;
}
