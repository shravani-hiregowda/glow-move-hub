import type {
  Workout,
  CreateWorkoutInput,
  UpdateWorkoutInput,
  WorkoutFilterQuery,
  HealthResponse,
  PaginatedResponse,
  UserDto,
  AuthResponse,
  LoginInput,
  RegisterInput,
  MediaDto,
  WorkoutSessionDto,
  WorkoutProgressSummaryDto,
  StartWorkoutSessionInput,
  UpdateWorkoutSessionProgressInput,
  CompleteWorkoutSessionInput,
  WorkoutSessionFilterQueryInput,
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

let inMemoryCsrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  inMemoryCsrfToken = token;
}

export function getCsrfToken(): string | null {
  if (inMemoryCsrfToken) {
    return inMemoryCsrfToken;
  }
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)jerai_csrf=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }
  return null;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const method = (options.method || "GET").toUpperCase();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  // Attach anti-CSRF token to state-changing requests
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) {
      headers["X-CSRF-Token"] = csrf;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Ensure session and CSRF cookies are included
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMsg = data?.error?.message || response.statusText || "Request failed";
    const errorCode = data?.error?.code || `HTTP_${response.status}`;
    throw new ApiError(errorMsg, response.status, errorCode, data?.error?.details);
  }

  // Update in-memory CSRF token if returned in response data
  if (data?.data?.csrfToken) {
    setCsrfToken(data.data.csrfToken);
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

  // Authentication endpoints
  async login(credentials: LoginInput): Promise<AuthResponse> {
    const res = await request<{ data: AuthResponse }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    if (res.data?.csrfToken) {
      setCsrfToken(res.data.csrfToken);
    }
    return res.data;
  },

  async register(input: RegisterInput): Promise<AuthResponse> {
    const res = await request<{ data: AuthResponse }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (res.data?.csrfToken) {
      setCsrfToken(res.data.csrfToken);
    }
    return res.data;
  },

  async getMe(): Promise<{ user: UserDto; csrfToken?: string }> {
    const res = await request<{ data: { user: UserDto; csrfToken?: string } }>("/auth/me");
    if (res.data?.csrfToken) {
      setCsrfToken(res.data.csrfToken);
    }
    return res.data;
  },

  async logout(): Promise<void> {
    await request<{ success: boolean }>("/auth/logout", {
      method: "POST",
    });
    setCsrfToken(null);
  },

  async fetchCsrfToken(): Promise<string | null> {
    try {
      const res = await request<{ data: { csrfToken: string } }>("/auth/csrf");
      if (res.data?.csrfToken) {
        setCsrfToken(res.data.csrfToken);
        return res.data.csrfToken;
      }
    } catch {
      // ignore
    }
    return null;
  },

  async uploadMedia(file: File | Blob, workoutId?: string): Promise<MediaDto> {
    const formData = new FormData();
    const filename = file instanceof File ? file.name : "workout-image.webp";
    formData.append("file", file, filename);
    if (workoutId) {
      formData.append("workoutId", workoutId);
    }
    const res = await request<{ data: MediaDto }>("/media/upload", {
      method: "POST",
      body: formData,
    });
    return res.data;
  },

  async deleteMedia(id: string): Promise<void> {
    await request<void>(`/media/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  // Workout Session & Progress endpoints
  async startSession(input: StartWorkoutSessionInput): Promise<WorkoutSessionDto> {
    const res = await request<{ data: WorkoutSessionDto }>("/sessions", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async getActiveSession(): Promise<WorkoutSessionDto | null> {
    const res = await request<{ data: WorkoutSessionDto | null }>("/sessions/active");
    return res.data;
  },

  async getSessionById(id: string): Promise<WorkoutSessionDto> {
    const res = await request<{ data: WorkoutSessionDto }>(`/sessions/${encodeURIComponent(id)}`);
    return res.data;
  },

  async updateSessionProgress(
    id: string,
    input: UpdateWorkoutSessionProgressInput
  ): Promise<WorkoutSessionDto> {
    const res = await request<{ data: WorkoutSessionDto }>(
      `/sessions/${encodeURIComponent(id)}/progress`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      }
    );
    return res.data;
  },

  async completeSession(
    id: string,
    input?: CompleteWorkoutSessionInput
  ): Promise<WorkoutSessionDto> {
    const res = await request<{ data: WorkoutSessionDto }>(
      `/sessions/${encodeURIComponent(id)}/complete`,
      {
        method: "POST",
        body: JSON.stringify(input || {}),
      }
    );
    return res.data;
  },

  async abandonSession(id: string): Promise<WorkoutSessionDto> {
    const res = await request<{ data: WorkoutSessionDto }>(
      `/sessions/${encodeURIComponent(id)}/abandon`,
      {
        method: "POST",
      }
    );
    return res.data;
  },

  async getSessions(
    query?: WorkoutSessionFilterQueryInput
  ): Promise<PaginatedResponse<WorkoutSessionDto>> {
    const params = new URLSearchParams();
    if (query?.status) params.set("status", query.status);
    if (query?.page) params.set("page", String(query.page));
    if (query?.limit) params.set("limit", String(query.limit));

    const qs = params.toString();
    const endpoint = `/sessions${qs ? `?${qs}` : ""}`;
    return request<PaginatedResponse<WorkoutSessionDto>>(endpoint);
  },

  async getSessionSummary(): Promise<WorkoutProgressSummaryDto> {
    const res = await request<{ data: WorkoutProgressSummaryDto }>("/sessions/summary");
    return res.data;
  },
};
