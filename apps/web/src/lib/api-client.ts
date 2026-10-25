import type {
  Workout,
  CreateWorkoutInput,
  UpdateWorkoutInput,
  WorkoutFilterQuery,
  HealthResponse,
  PaginatedResponse,
} from "@jerai/shared";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, status: number, code: string = "API_ERROR", details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMsg = data?.error?.message || response.statusText || "Request failed";
    const errorCode = data?.error?.code || `HTTP_${response.status}`;
    throw new ApiError(errorMsg, response.status, errorCode, data?.error?.details);
  }

  return data;
}

export const api = {
  async getHealth(): Promise<HealthResponse> {
    return request<HealthResponse>("/health");
  },

  async getWorkouts(
    query?: WorkoutFilterQuery
  ): Promise<PaginatedResponse<Workout>> {
    const params = new URLSearchParams();
    if (query?.bodyPart) params.set("bodyPart", query.bodyPart);
    if (query?.difficulty) params.set("difficulty", query.difficulty);
    if (query?.search) params.set("search", query.search);
    if (query?.page) params.set("page", String(query.page));
    if (query?.limit) params.set("limit", String(query.limit));

    const qs = params.toString();
    const endpoint = `/workouts${qs ? `?${qs}` : ""}`;
    return request<PaginatedResponse<Workout>>(endpoint);
  },

  async getWorkoutById(id: string): Promise<Workout> {
    const res = await request<{ data: Workout }>(`/workouts/${encodeURIComponent(id)}`);
    return res.data;
  },

  async createWorkout(workout: CreateWorkoutInput): Promise<Workout> {
    const res = await request<{ data: Workout }>("/workouts", {
      method: "POST",
      body: JSON.stringify(workout),
    });
    return res.data;
  },

  async updateWorkout(id: string, workout: UpdateWorkoutInput): Promise<Workout> {
    const res = await request<{ data: Workout }>(`/workouts/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(workout),
    });
    return res.data;
  },

  async deleteWorkout(id: string): Promise<void> {
    await request<void>(`/workouts/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
