import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import ProgressDashboard from "@/pages/ProgressDashboard";
import { api } from "@/lib/api-client";
import type { WorkoutProgressSummaryDto, PaginatedResponse, WorkoutSessionDto } from "@jerai/shared";

// Mock api client
vi.mock("@/lib/api-client", () => {
  return {
    api: {
      getSessionSummary: vi.fn(),
      getSessions: vi.fn(),
      getActiveSession: vi.fn(),
      startSession: vi.fn(),
      updateSessionProgress: vi.fn(),
      completeSession: vi.fn(),
      abandonSession: vi.fn(),
    },
    ApiError: class ApiError extends Error {},
  };
});

describe("ProgressDashboard Component", () => {
  let queryClient: QueryClient;

  const mockSummary: WorkoutProgressSummaryDto = {
    totalWorkoutsCompleted: 12,
    totalDurationSeconds: 7200, // 2 hours
    totalCaloriesBurned: 1440,
    activeSession: {
      id: "sess-active-1",
      userId: "u-1",
      workoutId: "w-pushup",
      status: "IN_PROGRESS",
      startedAt: "2026-10-26T10:00:00.000Z",
      endedAt: null,
      durationSeconds: 300,
      currentStepIndex: 1,
      workoutTitle: "Push-Up Power",
      workoutCalories: 120,
      totalSteps: 3,
      completedStepIndices: [0],
      createdAt: "2026-10-26T10:00:00.000Z",
      updatedAt: "2026-10-26T10:05:00.000Z",
    },
    recentSessions: [],
  };

  const mockSessionsPage: PaginatedResponse<WorkoutSessionDto> = {
    data: [
      {
        id: "sess-comp-1",
        userId: "u-1",
        workoutId: "w-bench",
        status: "COMPLETED",
        startedAt: "2026-10-25T14:00:00.000Z",
        endedAt: "2026-10-25T14:20:00.000Z",
        durationSeconds: 1200,
        currentStepIndex: 3,
        workoutTitle: "Dumbbell Bench Press",
        workoutCalories: 250,
        totalSteps: 4,
        completedStepIndices: [0, 1, 2, 3],
        createdAt: "2026-10-25T14:00:00.000Z",
        updatedAt: "2026-10-25T14:20:00.000Z",
      },
      {
        id: "sess-aban-1",
        userId: "u-1",
        workoutId: "w-squat",
        status: "ABANDONED",
        startedAt: "2026-10-24T09:00:00.000Z",
        endedAt: "2026-10-24T09:05:00.000Z",
        durationSeconds: 300,
        currentStepIndex: 1,
        workoutTitle: "Barbell Squat",
        workoutCalories: 300,
        totalSteps: 5,
        completedStepIndices: [0],
        createdAt: "2026-10-24T09:00:00.000Z",
        updatedAt: "2026-10-24T09:05:00.000Z",
      },
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ProgressDashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it("renders summary statistics cards with real data", async () => {
    vi.mocked(api.getSessionSummary).mockResolvedValue(mockSummary);
    vi.mocked(api.getSessions).mockResolvedValue(mockSessionsPage);

    renderDashboard();

    // Workouts completed count
    await waitFor(() => {
      expect(screen.getByText("12")).toBeInTheDocument();
    });

    // Total training time formatted (7200s => 2h 0m)
    expect(screen.getByText("2h 0m")).toBeInTheDocument();

    // Total calories burned
    expect(screen.getByText("1440 cal")).toBeInTheDocument();
  });

  it("renders active session alert banner with resume action", async () => {
    vi.mocked(api.getSessionSummary).mockResolvedValue(mockSummary);
    vi.mocked(api.getSessions).mockResolvedValue(mockSessionsPage);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Active Workout In Progress/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText("Push-Up Power").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /resume workout/i })).toBeInTheDocument();
  });

  it("renders session history with titles, status badges, and steps completed", async () => {
    vi.mocked(api.getSessionSummary).mockResolvedValue(mockSummary);
    vi.mocked(api.getSessions).mockResolvedValue(mockSessionsPage);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Dumbbell Bench Press")).toBeInTheDocument();
      expect(screen.getByText("COMPLETED")).toBeInTheDocument();
      expect(screen.getByText("4 of 4 steps completed")).toBeInTheDocument();
    });

    expect(screen.getByText("Barbell Squat")).toBeInTheDocument();
    expect(screen.getByText("ABANDONED")).toBeInTheDocument();
    expect(screen.getByText("1 of 5 steps completed")).toBeInTheDocument();
  });

  it("filters history list when status tabs are selected", async () => {
    vi.mocked(api.getSessionSummary).mockResolvedValue(mockSummary);
    vi.mocked(api.getSessions).mockResolvedValue(mockSessionsPage);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Dumbbell Bench Press")).toBeInTheDocument();
    });

    // Click "Completed" filter
    const completedTab = screen.getByRole("button", { name: "Completed" });
    fireEvent.click(completedTab);

    await waitFor(() => {
      expect(api.getSessions).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        status: "COMPLETED",
      });
    });
  });

  it("renders empty state when there are zero sessions recorded", async () => {
    vi.mocked(api.getSessionSummary).mockResolvedValue({
      totalWorkoutsCompleted: 0,
      totalDurationSeconds: 0,
      totalCaloriesBurned: 0,
      activeSession: null,
      recentSessions: [],
    });
    vi.mocked(api.getSessions).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("No workout sessions found")).toBeInTheDocument();
    });
  });

  it("renders error state with retry button on network failure", async () => {
    vi.mocked(api.getSessionSummary).mockResolvedValue(mockSummary);
    vi.mocked(api.getSessions).mockRejectedValue(new Error("Network connection dropped"));

    renderDashboard();

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load workout sessions from server/i)
      ).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole("button", { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();

    // Setup success on retry
    vi.mocked(api.getSessions).mockResolvedValue(mockSessionsPage);
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("Dumbbell Bench Press")).toBeInTheDocument();
    });
  });
});
