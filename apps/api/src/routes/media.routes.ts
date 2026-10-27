import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { env } from "../config/env";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import {
  uploadMedia,
  getMediaById,
  getMediaFileByKey,
  deleteMedia,
  migrateMediaHandler,
} from "../controllers/media.controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.STORAGE_MAX_FILE_SIZE_BYTES,
    files: 1,
  },
});

/**
 * Middleware wrapper for multer that handles file size limit and upload errors cleanly with 400 Bad Request.
 */
function handleUpload(fieldName: string) {
  const multerUpload = upload.single(fieldName);
  return (req: Request, res: Response, next: NextFunction) => {
    multerUpload(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(400).json({
            success: false,
            error: {
              code: "FILE_TOO_LARGE",
              message: `Upload exceeds maximum allowed size of ${(env.STORAGE_MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB.`,
            },
          });
          return;
        }
        res.status(400).json({
          success: false,
          error: {
            code: "UPLOAD_ERROR",
            message: err.message,
          },
        });
        return;
      }
      if (err) {
        return next(err);
      }
      next();
    });
  };
}

// Protected Upload: ADMIN only
router.post(
  "/media/upload",
  requireAuth,
  requireRole("ADMIN"),
  handleUpload("file"),
  uploadMedia
);

// Protected Media Migration: ADMIN only
router.post(
  "/media/migrate",
  requireAuth,
  requireRole("ADMIN"),
  migrateMediaHandler
);

// Protected Delete: ADMIN only
router.delete(
  "/media/:id",
  requireAuth,
  requireRole("ADMIN"),
  deleteMedia
);

// Public file delivery by key pattern (e.g. /api/v1/media/file/workouts/xyz.webp)
router.get(
  "/media/file/*",
  getMediaFileByKey
);

// Public metadata/retrieval by Media ID
router.get(
  "/media/:id",
  getMediaById
);

export default router;
