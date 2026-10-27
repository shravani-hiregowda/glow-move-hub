import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "../db/client";
import { getStorageService } from "./storage";
import {
  validateImageBuffer,
  parseBase64DataUrl,
  detectMimeTypeFromMagicBytes,
} from "../utils/mediaValidation";
import type { MediaMigrationStats } from "@jerai/shared";

export interface MigrationOptions {
  dryRun?: boolean;
  assetSearchDirs?: string[];
}

export async function runMediaMigration(
  options: MigrationOptions = {}
): Promise<MediaMigrationStats> {
  const dryRun = options.dryRun ?? false;
  const storage = getStorageService();

  // Search directories for local assets like /assets/workout-1.jpg
  const assetSearchDirs = options.assetSearchDirs ?? [
    path.resolve(process.cwd(), "../web/src/assets"),
    path.resolve(process.cwd(), "apps/web/src/assets"),
    path.resolve(process.cwd(), "src/assets"),
  ];

  const workouts = await prisma.workout.findMany({
    orderBy: { createdAt: "asc" },
  });

  const stats: MediaMigrationStats = {
    candidates: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    duplicates: 0,
    preservedSources: 0,
    dryRun,
    details: [],
  };

  for (const workout of workouts) {
    const rawImage = workout.image?.trim();

    if (!rawImage) {
      stats.skipped++;
      stats.details?.push({
        workoutId: workout.id,
        workoutTitle: workout.title,
        status: "skipped",
        reason: "Workout has empty image reference",
      });
      continue;
    }

    stats.candidates++;

    // 1. Check if already migrated to API media endpoint or storage URL
    if (rawImage.startsWith("/api/v1/media/")) {
      stats.skipped++;
      stats.details?.push({
        workoutId: workout.id,
        workoutTitle: workout.title,
        status: "skipped",
        reason: "Already migrated to media endpoint",
      });
      continue;
    }

    // 2. Check if external HTTP(S) URL
    if (/^https?:\/\//i.test(rawImage) && !rawImage.includes("localhost")) {
      stats.skipped++;
      stats.preservedSources++;
      stats.details?.push({
        workoutId: workout.id,
        workoutTitle: workout.title,
        status: "skipped",
        reason: "External URL preserved per migration policy",
      });
      continue;
    }

    let imageBuffer: Buffer | null = null;
    let declaredMime: string | undefined = undefined;
    let originalName: string = "migrated-image";

    // 3. Candidate: Base64 data URL
    if (rawImage.startsWith("data:image/")) {
      const parsed = parseBase64DataUrl(rawImage);
      if (!parsed) {
        stats.failed++;
        stats.preservedSources++;
        stats.details?.push({
          workoutId: workout.id,
          workoutTitle: workout.title,
          status: "failed",
          reason: "Malformed Base64 image data URL; source preserved",
        });
        continue;
      }
      imageBuffer = parsed.buffer;
      declaredMime = parsed.mimeType;
      originalName = `workout-${workout.id}-custom`;
    }

    // 4. Candidate: Local asset path (e.g., /assets/workout-1.jpg or workout-1.jpg)
    if (!imageBuffer) {
      const filename = path.basename(rawImage);
      let foundPath: string | null = null;

      for (const dir of assetSearchDirs) {
        const candidate = path.join(dir, filename);
        try {
          await fs.access(candidate);
          foundPath = candidate;
          break;
        } catch {
          // try next directory
        }
      }

      if (foundPath) {
        try {
          imageBuffer = await fs.readFile(foundPath);
          originalName = filename;
        } catch (readErr: unknown) {
          stats.failed++;
          stats.preservedSources++;
          stats.details?.push({
            workoutId: workout.id,
            workoutTitle: workout.title,
            status: "failed",
            reason: `Failed to read asset from disk (${(readErr as Error).message}); source preserved`,
          });
          continue;
        }
      }
    }

    // If source could not be resolved
    if (!imageBuffer) {
      stats.failed++;
      stats.preservedSources++;
      stats.details?.push({
        workoutId: workout.id,
        workoutTitle: workout.title,
        status: "failed",
        reason: `Image asset not found in search paths for '${rawImage}'; source preserved`,
      });
      continue;
    }

    // Validate image binary integrity
    const validation = validateImageBuffer(imageBuffer, declaredMime);
    if (!validation.valid || !validation.mimeType || !validation.extension) {
      stats.failed++;
      stats.preservedSources++;
      stats.details?.push({
        workoutId: workout.id,
        workoutTitle: workout.title,
        status: "failed",
        reason: `Validation failed: ${validation.error}; source preserved`,
      });
      continue;
    }

    const checksum = validation.checksum;

    // Check for deduplication: has this exact content already been uploaded?
    const existingMedia = await prisma.media.findFirst({
      where: { checksum },
    });

    if (existingMedia) {
      stats.duplicates++;
      if (!dryRun) {
        // Link to existing media and update workout image reference
        await prisma.workout.update({
          where: { id: workout.id },
          data: { image: existingMedia.url },
        });
      }
      stats.details?.push({
        workoutId: workout.id,
        workoutTitle: workout.title,
        status: "duplicate",
        reason: "Reused existing media with matching SHA-256 checksum",
        mediaId: existingMedia.id,
        objectKey: existingMedia.objectKey,
      });
      continue;
    }

    // Deterministic collision-safe object key based on checksum and extension
    const objectKey = `workouts/migrated-${checksum.slice(0, 16)}.${validation.extension}`;

    if (dryRun) {
      stats.migrated++;
      stats.details?.push({
        workoutId: workout.id,
        workoutTitle: workout.title,
        status: "migrated",
        reason: `[Dry Run] Validated ${validation.mimeType} (${validation.size} bytes). Would upload to '${objectKey}'`,
        objectKey,
      });
      continue;
    }

    // Real Migration Execution
    try {
      // Step 1: Upload to object storage
      await storage.putObject(objectKey, imageBuffer, validation.mimeType);

      // Step 2: Verify storage persistence
      const exists = await storage.objectExists(objectKey);
      if (!exists) {
        throw new Error(`Storage verification failed for key '${objectKey}'`);
      }

      const mediaUrl = `/api/v1/media/file/${objectKey}`;

      // Step 3: Persist media record and update workout atomically
      const createdMedia = await prisma.$transaction(async (tx) => {
        const media = await tx.media.create({
          data: {
            workoutId: workout.id,
            provider: storage.getProviderName(),
            objectKey,
            url: mediaUrl,
            mimeType: validation.mimeType!,
            fileSize: validation.size,
            checksum: validation.checksum,
            width: validation.width,
            height: validation.height,
            originalName,
            legacySource: rawImage, // Keep original reference for recovery/rollback
          },
        });

        await tx.workout.update({
          where: { id: workout.id },
          data: { image: mediaUrl },
        });

        return media;
      });

      stats.migrated++;
      stats.details?.push({
        workoutId: workout.id,
        workoutTitle: workout.title,
        status: "migrated",
        reason: `Successfully migrated to ${objectKey}`,
        mediaId: createdMedia.id,
        objectKey,
      });
    } catch (migErr: unknown) {
      // If error occurs, original workout image remains untouched
      stats.failed++;
      stats.preservedSources++;
      stats.details?.push({
        workoutId: workout.id,
        workoutTitle: workout.title,
        status: "failed",
        reason: `Migration transaction failed: ${(migErr as Error).message}; source preserved`,
      });
    }
  }

  return stats;
}

export async function rollbackMediaMigration(): Promise<{ restoredCount: number }> {
  // Find all media that saved a legacySource and is attached to a workout
  const mediaRecords = await prisma.media.findMany({
    where: {
      legacySource: { not: null },
      workoutId: { not: null },
    },
  });

  let restoredCount = 0;

  for (const record of mediaRecords) {
    if (record.workoutId && record.legacySource) {
      await prisma.workout.update({
        where: { id: record.workoutId },
        data: { image: record.legacySource },
      });
      restoredCount++;
    }
  }

  return { restoredCount };
}
