import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/client";
import { createWeightLogSchema } from "@jerai/shared";

export async function getWeightLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated." },
      });
      return;
    }

    const logs = await prisma.weightLog.findMany({
      where: { userId: req.user.id },
      orderBy: { loggedAt: "asc" },
    });

    const data = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      weight: log.weight,
      note: log.note,
      loggedAt: log.loggedAt.toISOString(),
      createdAt: log.createdAt.toISOString(),
    }));

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function createWeightLog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated." },
      });
      return;
    }

    const parseResult = createWeightLogSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parseResult.error.issues[0]?.message || "Invalid weight log input.",
          details: parseResult.error.issues,
        },
      });
      return;
    }

    const { weight, note, loggedAt } = parseResult.data;

    const log = await prisma.weightLog.create({
      data: {
        userId: req.user.id,
        weight,
        note: note || null,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: log.id,
        userId: log.userId,
        weight: log.weight,
        note: log.note,
        loggedAt: log.loggedAt.toISOString(),
        createdAt: log.createdAt.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteWeightLog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated." },
      });
      return;
    }

    const id = String(req.params.id);

    const existing = await prisma.weightLog.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== req.user.id) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Weight log entry not found." },
      });
      return;
    }

    await prisma.weightLog.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      data: { message: "Weight log deleted successfully." },
    });
  } catch (err) {
    next(err);
  }
}
