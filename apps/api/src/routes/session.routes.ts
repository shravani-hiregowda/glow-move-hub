import { Router } from "express";
import {
  startSessionHandler,
  getActiveSessionHandler,
  getProgressSummaryHandler,
  listSessionsHandler,
  getSessionByIdHandler,
  updateSessionProgressHandler,
  completeSessionHandler,
  abandonSessionHandler,
} from "../controllers/session.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validate.middleware";
import {
  startWorkoutSessionSchema,
  updateWorkoutSessionProgressSchema,
  completeWorkoutSessionSchema,
  workoutSessionFilterQuerySchema,
  sessionIdParamSchema,
} from "@jerai/shared";

const router = Router();

// All session and progress endpoints strictly require authenticated member identity
router.use("/sessions", requireAuth);

// Start a new workout session
router.post(
  "/sessions",
  validateRequest({ body: startWorkoutSessionSchema }),
  startSessionHandler
);

// Get authenticated user's currently active in-progress session (if any)
router.get("/sessions/active", getActiveSessionHandler);

// Get authenticated user's workout progress summary
router.get("/sessions/summary", getProgressSummaryHandler);

// List authenticated user's workout session history (paginated & filtered)
router.get(
  "/sessions",
  validateRequest({ query: workoutSessionFilterQuerySchema }),
  listSessionsHandler
);

// Get specific session details by ID
router.get(
  "/sessions/:id",
  validateRequest({ params: sessionIdParamSchema }),
  getSessionByIdHandler
);

// Update progress during active workout session
router.patch(
  "/sessions/:id/progress",
  validateRequest({
    params: sessionIdParamSchema,
    body: updateWorkoutSessionProgressSchema,
  }),
  updateSessionProgressHandler
);

// Mark workout session as completed
router.post(
  "/sessions/:id/complete",
  validateRequest({
    params: sessionIdParamSchema,
    body: completeWorkoutSessionSchema,
  }),
  completeSessionHandler
);

// Abandon/cancel workout session
router.post(
  "/sessions/:id/abandon",
  validateRequest({ params: sessionIdParamSchema }),
  abandonSessionHandler
);

export default router;
