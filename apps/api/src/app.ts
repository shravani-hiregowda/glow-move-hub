import express, { Request, Response } from "express";
import cors from "cors";
import { env } from "./config/env";
import { writeGuard } from "./middleware/writeGuard.middleware";
import { errorHandler } from "./middleware/errorHandler.middleware";
import healthRoutes from "./routes/health.routes";
import workoutRoutes from "./routes/workout.routes";

export function createApp() {
  const app = express();

  // Environment-aware CORS configuration
  const allowedOrigins = [env.CORS_ORIGIN, "http://localhost:8080", "http://localhost:5173"];
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV !== "production") {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    })
  );

  // Global write-access security guard (reject unauthenticated writes before parsing body)
  app.use(writeGuard);

  app.use(express.json({ limit: "1mb" }));

  // API v1 routes
  app.use("/api/v1", healthRoutes);
  app.use("/api/v1", workoutRoutes);

  // 404 handler for unmatched routes
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: "ROUTE_NOT_FOUND",
        message: `Endpoint ${req.method} ${req.path} not found.`,
      },
    });
  });

  // Centralized safe error handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
