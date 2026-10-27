import crypto from "node:crypto";
import { Readable } from "node:stream";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import {
  IStorageService,
  StoragePutResult,
  StorageGetResult,
} from "./storage.interface";

export interface S3StorageConfig {
  endpoint?: string;
  region?: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrlPrefix?: string;
  providerName?: "s3" | "r2";
}

export class S3StorageService implements IStorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrlPrefix?: string;
  private readonly providerName: string;

  constructor(config: S3StorageConfig) {
    if (!config.bucket) {
      throw new Error("S3StorageService: bucket is required in configuration");
    }
    if (!config.accessKeyId || !config.secretAccessKey) {
      throw new Error("S3StorageService: accessKeyId and secretAccessKey are required in configuration");
    }

    this.bucket = config.bucket;
    this.publicUrlPrefix = config.publicUrlPrefix;
    this.providerName = config.providerName || "s3";

    this.client = new S3Client({
      region: config.region || "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true, // Recommended for S3-compatible APIs such as MinIO / Ceph
    });
  }

  getProviderName(): string {
    return this.providerName;
  }

  async putObject(
    key: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<StoragePutResult> {
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
          "sha256-checksum": checksum,
        },
      })
    );

    // Verify object presence in bucket
    const head = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );

    if (head.ContentLength !== undefined && head.ContentLength !== buffer.length) {
      throw new Error(
        `S3 storage verification failed: remote object size (${head.ContentLength}) does not match local (${buffer.length})`
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
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      if (!response.Body) {
        return null;
      }

      // Convert readable stream to Buffer
      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

      return {
        buffer,
        mimeType: response.ContentType || "application/octet-stream",
        size: buffer.length,
        checksum,
      };
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      if (name === "NotFound" || name === "NoSuchKey") {
        return null;
      }
      throw err;
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      if (name === "NotFound" || name === "NoSuchKey") {
        return; // Idempotent
      }
      throw err;
    }
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      if (name === "NotFound" || name === "NoSuchKey") {
        return false;
      }
      throw err;
    }
  }

  getPublicUrl(key: string): string {
    if (this.publicUrlPrefix) {
      const cleanPrefix = this.publicUrlPrefix.replace(/\/+$/, "");
      return `${cleanPrefix}/${key}`;
    }
    return `/api/v1/media/file/${key}`;
  }
}
