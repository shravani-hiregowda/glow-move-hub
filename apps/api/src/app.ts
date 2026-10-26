import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { authenticateSession } from "./middleware/auth.middleware";
import { csrfProtection } from "./middleware/csrf.middleware";
import { errorHandler } from "./middleware/errorHandler.middleware";
import healthRoutes from "./routes/health.routes";
import authRoutes from "./routes/auth.routes";
import workoutRoutes from "./routes/workout.routes";
import mediaRoutes from "./routes/media.routes";

export function createApp() {
  const app = express();

  // Narrow, credentialed CORS configuration
  const allowedOrigins = [
    env.CORS_ORIGIN,
    "http://localhost:8080",
    "http://localhost:5173",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:5173",
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. server-to-server, curl, same-origin supertest)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));

  // CSRF Protection with strict Origin validation & anti-CSRF token verification
  app.use(csrfProtection);

  // Session authentication (attaches user and session to request if cookie present)
  app.use(authenticateSession);

  // API v1 routes
  app.use("/api/v1", healthRoutes);
  app.use("/api/v1", authRoutes);
  app.use("/api/v1", workoutRoutes);
  app.use("/api/v1", mediaRoutes);

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
