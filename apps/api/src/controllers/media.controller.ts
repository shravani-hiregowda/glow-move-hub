import { Request, Response, NextFunction } from "express";
import path from "node:path";
import { prisma } from "../db/client";
import { getStorageService } from "../services/storage";
import {
  validateImageBuffer,
  generateObjectKey,
} from "../utils/mediaValidation";
import { runMediaMigration } from "../services/mediaMigration.service";
import type { ApiResponse, MediaDto, MediaMigrationStats } from "@jerai/shared";

export async function uploadMedia(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = req.file;
    if (!file || !file.buffer || file.buffer.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "No image file provided. Please upload an image file.",
        },
      });
      return;
    }

    // Server-side binary validation
    const validation = validateImageBuffer(file.buffer, file.mimetype);
    if (!validation.valid || !validation.mimeType || !validation.extension) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_MEDIA",
          message: validation.error || "Invalid image file format.",
        },
      });
      return;
    }

    const storage = getStorageService();
    const objectKey = generateObjectKey(validation.extension);

    // Upload to object storage
    await storage.putObject(objectKey, file.buffer, validation.mimeType);

    // Verify stored object exists
    const exists = await storage.objectExists(objectKey);
    if (!exists) {
      res.status(500).json({
        success: false,
        error: {
          code: "STORAGE_ERROR",
          message: "Object storage failed to verify the uploaded asset.",
        },
      });
      return;
    }

    const mediaUrl = `/api/v1/media/file/${objectKey}`;
    const sanitizedOriginalName = file.originalname
      ? path.basename(file.originalname).slice(0, 255)
      : null;

    const workoutId = typeof req.body.workoutId === "string" && req.body.workoutId.trim()
      ? req.body.workoutId.trim()
      : null;

    let legacySource: string | null = null;

    // If attached to an existing workout, record its previous image for safety
    if (workoutId) {
      const existingWorkout = await prisma.workout.findUnique({
        where: { id: workoutId },
      });
      if (existingWorkout) {
        legacySource = existingWorkout.image;
      }
    }

    let createdMedia;
    try {
      createdMedia = await prisma.$transaction(async (tx) => {
        const media = await tx.media.create({
          data: {
            workoutId,
            provider: storage.getProviderName(),
            objectKey,
            url: mediaUrl,
            mimeType: validation.mimeType!,
            fileSize: validation.size,
            checksum: validation.checksum,
            width: validation.width,
            height: validation.height,
            originalName: sanitizedOriginalName,
            legacySource,
          },
        });

        if (workoutId) {
          await tx.workout.update({
            where: { id: workoutId },
            data: { image: mediaUrl },
          });
        }

        return media;
      });
    } catch (dbErr: unknown) {
      // Database transaction failed: clean up newly created orphan storage object to avoid leaks
      await storage.deleteObject(objectKey).catch(() => {});
      throw dbErr;
    }

    const mediaDto: MediaDto = {
      id: createdMedia.id,
      workoutId: createdMedia.workoutId,
      provider: createdMedia.provider,
      objectKey: createdMedia.objectKey,
      url: createdMedia.url,
      mimeType: createdMedia.mimeType,
      fileSize: createdMedia.fileSize,
      checksum: createdMedia.checksum,
      width: createdMedia.width,
      height: createdMedia.height,
      originalName: createdMedia.originalName,
      createdAt: createdMedia.createdAt.toISOString(),
      updatedAt: createdMedia.updatedAt.toISOString(),
    };

    const response: ApiResponse<MediaDto> = {
      success: true,
      data: mediaDto,
    };

    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

export async function getMediaById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = String(req.params.id || "");
    const media = await prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Media not found",
        },
      });
      return;
    }

    const storage = getStorageService();
    const object = await storage.getObject(media.objectKey);

    if (!object) {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Media object not found in storage",
        },
      });
      return;
    }

    res.setHeader("Content-Type", media.mimeType);
    res.setHeader("Content-Length", object.size);
    res.setHeader("ETag", `"${media.checksum}"`);
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.send(object.buffer);
  } catch (err) {
    next(err);
  }
}

export async function getMediaFileByKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // req.params[0] captures wildcard matching (e.g. workouts/uuid.webp)
    const rawKey = req.params[0] || req.params.key;
    const key = Array.isArray(rawKey) ? rawKey[0] : String(rawKey || "");
    if (!key) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Object key parameter is required",
        },
      });
      return;
    }

    const storage = getStorageService();
    const object = await storage.getObject(key);

    if (!object) {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Requested media file not found",
        },
      });
      return;
    }

    res.setHeader("Content-Type", object.mimeType);
    res.setHeader("Content-Length", object.size);
    res.setHeader("ETag", `"${object.checksum}"`);
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.send(object.buffer);
  } catch (err: unknown) {
    // Catch path traversal rejection safely
    if ((err as Error)?.message?.includes("Path traversal denied")) {
      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Access to specified path is forbidden",
        },
      });
      return;
    }
    next(err);
  }
}

export async function deleteMedia(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = String(req.params.id || "");
    const media = await prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Media not found",
        },
      });
      return;
    }

    const storage = getStorageService();

    // Delete object from storage
    await storage.deleteObject(media.objectKey);

    // If attached to workout and workout currently uses this media URL, safely restore legacy source
    if (media.workoutId) {
      const workout = await prisma.workout.findUnique({
        where: { id: media.workoutId },
      });
      if (workout && workout.image === media.url) {
        await prisma.workout.update({
          where: { id: media.workoutId },
          data: {
            image: media.legacySource || "/placeholder.svg",
          },
        });
      }
    }

    // Delete record from database
    await prisma.media.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Media deleted successfully",
    });
  } catch (err) {
    next(err);
  }
}

export async function migrateMediaHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dryRun = req.query.dryRun === "true" || req.query.dryRun === "1";
    const stats: MediaMigrationStats = await runMediaMigration({ dryRun });

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
}
