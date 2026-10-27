import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WorkoutProvider, useWorkoutContext } from "@/contexts/WorkoutContext";
import WorkoutsSection from "@/components/WorkoutsSection";
import { api, ApiError } from "@/lib/api-client";
import type { Workout } from "@/data/workouts";

// Mock API client
vi.mock("@/lib/api-client", () => {
  return {
    api: {
      getWorkouts: vi.fn(),
      getWorkoutById: vi.fn(),
      createWorkout: vi.fn(),
      updateWorkout: vi.fn(),
      deleteWorkout: vi.fn(),
    },
    ApiError: class ApiError extends Error {
      status: number;
      code: string;
      constructor(message: string, status: number, code: string = "API_ERROR") {
        super(message);
        this.status = status;
        this.code = code;
      }
    },
  };
});

const mockApiWorkouts: Workout[] = [
  {
    id: "api-w1",
    title: "PostgreSQL Deadlift",
    difficulty: "Advanced",
    bodyPart: "Back",
    image: "/assets/workout-heavy.png",
    duration: "30 min",
    calories: 350,
    videoUrl: "https://example.com/deadlift",
    description: "Heavy compound lift fetched from PostgreSQL database.",
    steps: ["Set up bar", "Lift with legs", "Lock out"],
  },
  {
    id: "api-w2",
    title: "API Push-Up",
    difficulty: "Beginner",
    bodyPart: "Chest",
    image: "/assets/workout-1.jpg",
    duration: "15 min",
    calories: 120,
    videoUrl: "https://example.com/pushup",
    description: "Chest push-up from API catalog.",
    steps: ["Plank position", "Lower down", "Push up"],
  },
];

function TestConsumer() {
  const { workouts, isLoading, isError, error, mutationError } = useWorkoutContext();
  return (
    <div>
      {isLoading && <span data-testid="loading-indicator">Loading catalog...</span>}
      {isError && <span data-testid="error-indicator">{error?.message}</span>}
      {mutationError && <span data-testid="mutation-error">{mutationError}</span>}
      <ul data-testid="workout-list">
        {workouts.map((w) => (
          <li key={w.id}>{w.title}</li>
        ))}
      </ul>
    </div>
  );
}

describe("Frontend API & React Query Integration", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it("fetches and renders catalog data from the PostgreSQL API via TanStack Query", async () => {
    vi.mocked(api.getWorkouts).mockResolvedValue({
      data: mockApiWorkouts,
      pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <WorkoutProvider>
          <TestConsumer />
        </WorkoutProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("PostgreSQL Deadlift")).toBeInTheDocument();
      expect(screen.getByText("API Push-Up")).toBeInTheDocument();
    });
  });

  it("renders loading state in WorkoutsSection during query execution", () => {
    render(
      <WorkoutsSection
        workouts={[]}
        onSelect={() => {}}
        isLoading={true}
      />
    );

    // Should display skeleton elements
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders error state with retry button in WorkoutsSection on query failure", () => {
    const handleRetry = vi.fn();
    render(
      <WorkoutsSection
        workouts={[]}
        onSelect={() => {}}
        isLoading={false}
        isError={true}
        errorMessage="Database unreachable"
        onRetry={handleRetry}
      />
    );

    expect(screen.getByText("Failed to load workouts from server")).toBeInTheDocument();
    expect(screen.getByText("Database unreachable")).toBeInTheDocument();

    const retryBtn = screen.getByText("Retry Connection");
    retryBtn.click();
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it("renders empty state when filter criteria matches zero workouts", () => {
    render(
      <WorkoutsSection
        workouts={mockApiWorkouts}
        onSelect={() => {}}
        isLoading={false}
      />
    );

    const searchInput = screen.getByPlaceholderText("Search workouts...");
    fireEvent.change(searchInput, { target: { value: "NonExistentWorkoutKeywordXYZ" } });

    // Verify empty state text is rendered
    expect(screen.getByText("No workouts found. Try different filters!")).toBeInTheDocument();
  });

  it("handles write failure (e.g., write-guard 403) and displays mutation error without false success", async () => {
    vi.mocked(api.createWorkout).mockRejectedValue(
      new ApiError("Write operations are disabled pending Phase 4 authentication.", 403, "WRITES_DISABLED")
    );

    function MutationTestConsumer() {
      const { addWorkout, mutationError } = useWorkoutContext();
      return (
        <div>
          <button
            onClick={() =>
              addWorkout({
                id: "w-fail",
                title: "Blocked Workout",
                difficulty: "Beginner",
                bodyPart: "Chest",
                image: "/assets/workout-1.jpg",
                duration: "10 min",
                calories: 100,
                videoUrl: "",
                description: "This should fail",
                steps: ["Step 1"],
              })
            }
          >
            Add Workout
          </button>
          {mutationError && <span data-testid="error-badge">{mutationError}</span>}
        </div>
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <WorkoutProvider>
          <MutationTestConsumer />
        </WorkoutProvider>
      </QueryClientProvider>
    );

    const addBtn = screen.getByText("Add Workout");
    addBtn.click();

    await waitFor(() => {
      expect(screen.getByTestId("error-badge")).toHaveTextContent(
        "Write operations are disabled pending Phase 4 authentication."
      );
    });
  });
});
