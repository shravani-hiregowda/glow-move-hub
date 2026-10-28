export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export const DIFFICULTY_VALUES: readonly Difficulty[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
] as const;

export const BODY_PARTS = [
  "Chest",
  "Back",
  "Legs",
  "Arms",
  "Core",
  "Full Body",
  "Shoulders",
  "Triceps",
  "Biceps",
  "Fat Loss",
  "Cardio",
] as const;

export type BodyPart = typeof BODY_PARTS[number];

export interface WorkoutStepDto {
  id?: string;
  stepOrder: number;
  instruction: string;
}

export interface WorkoutDto {
  id: string;
  title: string;
  difficulty: Difficulty;
  bodyPart: BodyPart;
  image: string;
  duration: string;
  calories: number;
  videoUrl: string;
  steps: string[];
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

// Backward compatibility with frontend
export type Workout = WorkoutDto;

export interface WorkoutFilterQuery {
  bodyPart?: string;
  difficulty?: Difficulty;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface HealthResponse {
  status: "ok" | "degraded" | "error";
  service: string;
  timestamp: string;
  database: {
    connected: boolean;
    error?: string;
  };
  environment: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type Role = "MEMBER" | "ADMIN";

export const ROLES: readonly Role[] = ["MEMBER", "ADMIN"] as const;

export interface UserDto {
  id: string;
  name?: string | null;
  email: string;
  role: Role;
  targetWeight?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WeightLogDto {
  id: string;
  userId: string;
  weight: number;
  note?: string | null;
  loggedAt: string;
  createdAt: string;
}

export interface StreakSummaryDto {
  currentStreakDays: number;
  longestStreakDays: number;
  totalActiveDays: number;
  completionRateWeek: number;
}

export interface AuthResponse {
  user: UserDto;
  csrfToken?: string;
}

export interface MediaDto {
  id: string;
  workoutId?: string | null;
  provider: string;
  objectKey: string;
  url: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
  width?: number | null;
  height?: number | null;
  originalName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MediaMigrationStats {
  candidates: number;
  migrated: number;
  skipped: number;
  failed: number;
  duplicates: number;
  preservedSources: number;
  dryRun: boolean;
  details?: Array<{
    workoutId: string;
    workoutTitle: string;
    status: "migrated" | "skipped" | "failed" | "duplicate";
    reason?: string;
    mediaId?: string;
    objectKey?: string;
  }>;
}

export type WorkoutSessionStatus = "IN_PROGRESS" | "COMPLETED" | "ABANDONED";

export const WORKOUT_SESSION_STATUSES: readonly WorkoutSessionStatus[] = [
  "IN_PROGRESS",
  "COMPLETED",
  "ABANDONED",
] as const;

export interface WorkoutSessionStepDto {
  id: string;
  workoutSessionId: string;
  stepIndex: number;
  completedAt: string;
}

export interface WorkoutSessionDto {
  id: string;
  userId: string;
  workoutId: string;
  status: WorkoutSessionStatus;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  currentStepIndex: number;
  workoutTitle: string;
  workoutCalories: number;
  totalSteps: number;
  completedStepIndices: number[];
  createdAt: string;
  updatedAt: string;
  workout?: WorkoutDto;
}

export interface WorkoutProgressSummaryDto {
  totalWorkoutsCompleted: number;
  totalDurationSeconds: number;
  totalCaloriesBurned: number;
  activeSession: WorkoutSessionDto | null;
  recentSessions: WorkoutSessionDto[];
}
