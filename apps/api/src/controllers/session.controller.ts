import { Request, Response, NextFunction } from "express";
import {
  StartWorkoutSessionInput,
  UpdateWorkoutSessionProgressInput,
  CompleteWorkoutSessionInput,
  WorkoutSessionFilterQueryInput,
} from "@jerai/shared";
import {
  startSession,
  getActiveSession,
  getSessionById,
  updateSessionProgress,
  completeSession,
  abandonSession,
  listUserSessions,
  getUserProgressSummary,
  SessionServiceError,
} from "../services/session.service";

function handleSessionError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof SessionServiceError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }
  next(err);
}

export async function startSessionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const input = req.body as StartWorkoutSessionInput;
    const session = await startSession(userId, input);

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (err) {
    handleSessionError(err, res, next);
  }
}

export async function getActiveSessionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const active = await getActiveSession(userId);

    res.status(200).json({
      success: true,
      data: active,
    });
  } catch (err) {
    handleSessionError(err, res, next);
  }
}

export async function getSessionByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = String(req.params.id);
    const session = await getSessionById(userId, id);

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (err) {
    handleSessionError(err, res, next);
  }
}

export async function updateSessionProgressHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = String(req.params.id);
    const input = req.body as UpdateWorkoutSessionProgressInput;
    const updated = await updateSessionProgress(userId, id, input);

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    handleSessionError(err, res, next);
  }
}

export async function completeSessionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = String(req.params.id);
    const input = req.body as CompleteWorkoutSessionInput;
    const completed = await completeSession(userId, id, input);

    res.status(200).json({
      success: true,
      data: completed,
    });
  } catch (err) {
    handleSessionError(err, res, next);
  }
}

export async function abandonSessionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = String(req.params.id);
    const abandoned = await abandonSession(userId, id);

    res.status(200).json({
      success: true,
      data: abandoned,
    });
  } catch (err) {
    handleSessionError(err, res, next);
  }
}

export async function listSessionsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const query = req.query as unknown as WorkoutSessionFilterQueryInput;
    const result = await listUserSessions(userId, query);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    handleSessionError(err, res, next);
  }
}

export async function getProgressSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const summary = await getUserProgressSummary(userId);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (err) {
    handleSessionError(err, res, next);
  }
}
