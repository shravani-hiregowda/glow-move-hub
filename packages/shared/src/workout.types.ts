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
  email: string;
  role: Role;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: UserDto;
  csrfToken?: string;
}
