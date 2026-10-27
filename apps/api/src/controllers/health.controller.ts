import { Request, Response } from "express";
import { checkDatabaseConnection } from "../db/client";
import { env } from "../config/env";
import { HealthResponse } from "@jerai/shared";

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const isDbConnected = await checkDatabaseConnection();

  const response: HealthResponse = {
    status: isDbConnected ? "ok" : "degraded",
    service: "jerai-fit-api",
    timestamp: new Date().toISOString(),
    database: {
      connected: isDbConnected,
      ...(isDbConnected ? {} : { error: "Database connection failed" }),
    },
    environment: env.NODE_ENV,
  };

  const statusCode = isDbConnected ? 200 : 503;
  res.status(statusCode).json(response);
}
