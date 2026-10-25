import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "The requested resource was not found.",
        },
      });
      return;
    }

    if (err.code === "P2002") {
      res.status(409).json({
        success: false,
        error: {
          code: "CONFLICT",
          message: "A resource with this identifier already exists.",
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "A database error occurred while processing your request.",
      },
    });
    return;
  }

  // Handle Prisma connection errors
  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError
  ) {
    res.status(503).json({
      success: false,
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Database service is temporarily unavailable.",
      },
    });
    return;
  }

  // Generic fallback without exposing internal error or stack trace
  console.error("[API Error]", err);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected internal server error occurred.",
    },
  });
}
