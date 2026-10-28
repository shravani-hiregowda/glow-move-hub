import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { isAllowedOrigin } from "./utils/origin";
import { proxyAuthGuard } from "./middleware/proxyAuth.middleware";
import { authenticateSession } from "./middleware/auth.middleware";
import { csrfProtection } from "./middleware/csrf.middleware";
import { errorHandler } from "./middleware/errorHandler.middleware";
import healthRoutes from "./routes/health.routes";
import authRoutes from "./routes/auth.routes";
import workoutRoutes from "./routes/workout.routes";
import mediaRoutes from "./routes/media.routes";
import sessionRoutes from "./routes/session.routes";
import weightRoutes from "./routes/weight.routes";

export function createApp() {
  const app = express();

  // Configure reverse proxy trust based on explicit operator topology (never blindly trust arbitrary headers)
  if (env.TRUST_PROXY) {
    const numeric = Number(env.TRUST_PROXY);
    app.set("trust proxy", !isNaN(numeric) ? numeric : env.TRUST_PROXY);
  }

  // Fail-closed proxy authentication guard: runs before CORS, rate limiters, or application routes
  app.use(proxyAuthGuard);

  // Narrow, credentialed CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
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

  // API v1 routes & root health probe
  app.use("/health", healthRoutes);
  app.use("/api/v1", healthRoutes);
  app.use("/api/v1", authRoutes);
  app.use("/api/v1", workoutRoutes);
  app.use("/api/v1", mediaRoutes);
  app.use("/api/v1", sessionRoutes);
  app.use("/api/v1", weightRoutes);

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
