import { z } from "zod";
import { BODY_PARTS, DIFFICULTY_VALUES, WORKOUT_SESSION_STATUSES } from "./workout.types";

export const workoutDifficultySchema = z.enum(
  DIFFICULTY_VALUES as unknown as [string, ...string[]]
);

export const workoutBodyPartSchema = z.enum(
  BODY_PARTS as unknown as [string, ...string[]]
);

export const workoutStepSchema = z
  .string()
  .trim()
  .min(1, "Step instruction cannot be empty")
  .max(500, "Step instruction cannot exceed 500 characters");

export const createWorkoutSchema = z.object({
  id: z.string().trim().min(1).optional(),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(100, "Title cannot exceed 100 characters"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(2000, "Description cannot exceed 2000 characters"),
  difficulty: workoutDifficultySchema,
  bodyPart: workoutBodyPartSchema,
  duration: z
    .string()
    .trim()
    .min(1, "Duration is required")
    .max(50, "Duration cannot exceed 50 characters"),
  calories: z
    .number({ invalid_type_error: "Calories must be a number" })
    .int("Calories must be a whole number")
    .nonnegative("Calories must be 0 or greater")
    .max(10000, "Calories cannot exceed 10,000"),
  videoUrl: z
    .string()
    .trim()
    .refine(
      (val) => val === "" || /^https?:\/\//i.test(val),
      "Video URL must be a valid http/https URL"
    ),
  image: z
    .string()
    .trim()
    .min(1, "Image reference is required")
    .max(2000, "Image reference cannot exceed 2000 characters"),
  steps: z
    .array(workoutStepSchema)
    .min(1, "At least one workout step is required")
    .max(50, "Cannot have more than 50 steps"),
});

export const updateWorkoutSchema = createWorkoutSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  "At least one field must be provided for update"
);

export const workoutIdParamSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "Workout ID must not be empty")
    .max(128, "Workout ID is too long"),
});

export const workoutFilterQuerySchema = z.object({
  bodyPart: z.string().trim().optional(),
  difficulty: workoutDifficultySchema.optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
export type WorkoutFilterQueryInput = z.infer<typeof workoutFilterQuerySchema>;
export type WorkoutIdParamInput = z.infer<typeof workoutIdParamSchema>;

export const roleSchema = z.enum(["MEMBER", "ADMIN"]);

export const emailSchema = z
  .string({ required_error: "Email is required" })
  .trim()
  .toLowerCase()
  .email("Invalid email format")
  .max(255, "Email cannot exceed 255 characters")
  .refine(
    (email) => {
      if (typeof process !== "undefined" && process.env?.NODE_ENV === "test") {
        return (
          email.endsWith("@jeraifit.com") ||
          email.endsWith("@example.com") ||
          email.endsWith("@jerai.fit") ||
          email.endsWith("@test.local")
        );
      }
      return email.endsWith("@jeraifit.com");
    },
    { message: "Email address must belong to the @jeraifit.com domain" }
  );

export const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password cannot exceed 128 characters");

export const nameSchema = z
  .string({ required_error: "Name is required" })
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name cannot exceed 100 characters");

export const registerSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required")
    .max(128, "Password cannot exceed 128 characters"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const mediaUploadQuerySchema = z.object({
  workoutId: z.string().trim().optional(),
});

export const mediaMigrationQuerySchema = z.object({
  dryRun: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === "boolean") return val;
      if (typeof val === "string") return val.toLowerCase() === "true" || val === "1";
      return false;
    }),
});

export type MediaUploadQueryInput = z.infer<typeof mediaUploadQuerySchema>;
export type MediaMigrationQueryInput = z.infer<typeof mediaMigrationQuerySchema>;

export const workoutSessionStatusSchema = z.enum(
  WORKOUT_SESSION_STATUSES as unknown as [string, ...string[]]
);

export const startWorkoutSessionSchema = z.object({
  workoutId: z
    .string({ required_error: "Workout ID is required" })
    .trim()
    .min(1, "Workout ID must not be empty")
    .max(128, "Workout ID is too long"),
});

export const updateWorkoutSessionProgressSchema = z
  .object({
    currentStepIndex: z.number().int().min(0).max(100).optional(),
    completedStepIndices: z.array(z.number().int().min(0).max(100)).optional(),
    durationSeconds: z.number().int().min(0).max(86400).optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided for progress update"
  );

export const completeWorkoutSessionSchema = z.object({
  durationSeconds: z.number().int().min(0).max(86400).optional(),
  completedStepIndices: z.array(z.number().int().min(0).max(100)).optional(),
});

export const workoutSessionFilterQuerySchema = z.object({
  status: workoutSessionStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const sessionIdParamSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "Session ID must not be empty")
    .max(128, "Session ID is too long"),
});

export type StartWorkoutSessionInput = z.infer<typeof startWorkoutSessionSchema>;
export type UpdateWorkoutSessionProgressInput = z.infer<typeof updateWorkoutSessionProgressSchema>;
export type CompleteWorkoutSessionInput = z.infer<typeof completeWorkoutSessionSchema>;
export type WorkoutSessionFilterQueryInput = z.infer<typeof workoutSessionFilterQuerySchema>;
export type SessionIdParamInput = z.infer<typeof sessionIdParamSchema>;

export const createWeightLogSchema = z.object({
  weight: z.number().min(20, "Weight must be at least 20 kg").max(500, "Weight must not exceed 500 kg"),
  note: z.string().trim().max(255, "Note must not exceed 255 characters").optional(),
  loggedAt: z.string().datetime().optional(),
});

export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  targetWeight: z.number().min(20).max(500).nullable().optional(),
});

export const switchRoleSchema = z.object({
  role: z.enum(["MEMBER", "ADMIN"]),
});

export type CreateWeightLogInput = z.infer<typeof createWeightLogSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type SwitchRoleInput = z.infer<typeof switchRoleSchema>;
