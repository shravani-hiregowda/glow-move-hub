import { Router } from "express";
import {
  listWorkouts,
  getWorkoutById,
  createWorkout,
  updateWorkout,
  deleteWorkout,
} from "../controllers/workout.controller";
import { validateRequest } from "../middleware/validate.middleware";
import {
  createWorkoutSchema,
  updateWorkoutSchema,
  workoutFilterQuerySchema,
  workoutIdParamSchema,
} from "@jerai/shared";

const router = Router();

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

router.post(
  "/workouts",
  validateRequest({ body: createWorkoutSchema }),
  createWorkout
);

router.put(
  "/workouts/:id",
  validateRequest({ params: workoutIdParamSchema, body: updateWorkoutSchema }),
  updateWorkout
);

router.delete(
  "/workouts/:id",
  validateRequest({ params: workoutIdParamSchema }),
  deleteWorkout
);

export default router;
