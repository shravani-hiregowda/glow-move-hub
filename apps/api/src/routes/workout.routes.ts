import { Router } from "express";
import {
  listWorkouts,
  getWorkoutById,
  createWorkout,
  updateWorkout,
  deleteWorkout,
} from "../controllers/workout.controller";
import { validateRequest } from "../middleware/validate.middleware";
import { requireRole } from "../middleware/auth.middleware";
import {
  createWorkoutSchema,
  updateWorkoutSchema,
  workoutFilterQuerySchema,
  workoutIdParamSchema,
} from "@jerai/shared";

const router = Router();

// Public read-only endpoints
router.get(
  "/workouts",
  validateRequest({ query: workoutFilterQuerySchema }),
  listWorkouts
);

router.get(
  "/workouts/:id",
  validateRequest({ params: workoutIdParamSchema }),
  getWorkoutById
);

// Protected ADMIN-only mutation endpoints
router.post(
  "/workouts",
  requireRole("ADMIN"),
  validateRequest({ body: createWorkoutSchema }),
  createWorkout
);

router.put(
  "/workouts/:id",
  requireRole("ADMIN"),
  validateRequest({ params: workoutIdParamSchema, body: updateWorkoutSchema }),
  updateWorkout
);

router.delete(
  "/workouts/:id",
  requireRole("ADMIN"),
  validateRequest({ params: workoutIdParamSchema }),
  deleteWorkout
);

export default router;
