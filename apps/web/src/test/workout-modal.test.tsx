import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import WorkoutModal from "@/components/WorkoutModal";
import { Workout } from "@/data/workouts";
import { api } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  api: {
    getActiveSession: vi.fn().mockResolvedValue(null),
    startSession: vi.fn(),
    updateSessionProgress: vi.fn(),
    completeSession: vi.fn(),
    abandonSession: vi.fn(),
  },
  ApiError: class ApiError extends Error {},
}));

const sampleModalWorkout: Workout = {
  id: "modal-test-1",
  title: "Core Crusher Planks",
  difficulty: "Intermediate",
  bodyPart: "Core",
  image: "https://example.com/core.jpg",
  duration: "2 min",
  calories: 30,
  videoUrl: "https://www.youtube.com/embed/test",
  description: "Hold perfect alignment for 2 solid minutes.",
  steps: ["Elbows below shoulders", "Squeeze glutes and abs", "Breathe steadily"],
};

describe("WorkoutModal & Focus Mode Timer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders workout details and extracts initial duration in minutes correctly", () => {
    render(<WorkoutModal workout={sampleModalWorkout} onClose={() => {}} />);

    expect(screen.getByText("Core Crusher Planks")).toBeInTheDocument();
    expect(screen.getByText("Hold perfect alignment for 2 solid minutes.")).toBeInTheDocument();
    // 2 min converted to seconds = 120s => 2:00
    expect(screen.getByText("2:00")).toBeInTheDocument();
    expect(screen.getByText("Elbows below shoulders")).toBeInTheDocument();
  });

  it("toggles step completion checklist state on click", () => {
    render(<WorkoutModal workout={sampleModalWorkout} onClose={() => {}} />);

    const stepBtn = screen.getByText("Elbows below shoulders").closest("button");
    expect(stepBtn).toBeDefined();

    // Initially not completed (no line-through class)
    expect(screen.getByText("Elbows below shoulders")).not.toHaveClass("line-through");

    // Click to complete
    fireEvent.click(stepBtn!);
    expect(screen.getByText("Elbows below shoulders")).toHaveClass("line-through");

    // Click again to un-complete
    fireEvent.click(stepBtn!);
    expect(screen.getByText("Elbows below shoulders")).not.toHaveClass("line-through");
  });

  it("starts, counts down, pauses, and resets timer", () => {
    render(<WorkoutModal workout={sampleModalWorkout} onClose={() => {}} />);

    const startBtn = screen.getByRole("button", { name: /start/i });
    expect(startBtn).toBeInTheDocument();

    // Start timer
    fireEvent.click(startBtn);

    // Button should now show "Pause"
    expect(screen.getByRole("button", { name: /pause/i })).toBeInTheDocument();

    // Advance 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // 120s - 5s = 115s => 1:55
    expect(screen.getByText("1:55")).toBeInTheDocument();

    // Pause timer
    const pauseBtn = screen.getByRole("button", { name: /pause/i });
    fireEvent.click(pauseBtn);

    // Button switches back to Start
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();

    // Advance 5 more seconds; timer should remain at 1:55
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText("1:55")).toBeInTheDocument();

    // Click Reset Timer
    const resetBtn = screen.getByTitle("Reset Timer");
    fireEvent.click(resetBtn);

    // Back to 2:00
    expect(screen.getByText("2:00")).toBeInTheDocument();
  });

  it("handles timer completion at 00:00 and shows Done status", () => {
    // Workout with 1 minute (60s)
    const quickWorkout: Workout = { ...sampleModalWorkout, duration: "1 min" };
    render(<WorkoutModal workout={quickWorkout} onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(screen.getByText("0:00")).toBeInTheDocument();
    expect(screen.getByText(/done!/i)).toBeInTheDocument();
  });

  it("cleans up active timer interval when modal is closed / unmounted", () => {
    const { unmount } = render(<WorkoutModal workout={sampleModalWorkout} onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    // Unmount while running
    unmount();

    // Should not throw errors during subsequent clock advancement
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(10000);
      });
    }).not.toThrow();
  });

  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn();
    render(<WorkoutModal workout={sampleModalWorkout} onClose={handleClose} />);

    // Close button has an X icon and is positioned absolute
    const buttons = screen.getAllByRole("button");
    const closeBtn = buttons[0]; // first button in modal header
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  describe("Active Workout Protection & Warning", () => {
    let testQueryClient: QueryClient;

    beforeEach(() => {
      vi.useRealTimers();
      testQueryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
        },
      });
      vi.mocked(api.getActiveSession).mockReset().mockResolvedValue(null);
      vi.mocked(api.startSession).mockReset();
      vi.mocked(api.abandonSession).mockReset();
    });

    it("warns user before starting if another workout session is already in progress, and preserves session on cancel", async () => {
      // Prior session for a different workout ("w-prior-99")
      vi.mocked(api.getActiveSession).mockResolvedValue({
        id: "sess-prior-1",
        userId: "u-1",
        workoutId: "w-prior-99",
        status: "IN_PROGRESS",
        startedAt: "2026-10-26T10:00:00.000Z",
        endedAt: null,
        durationSeconds: 120,
        currentStepIndex: 1,
        workoutTitle: "Push-Up Blast",
        workoutCalories: 150,
        totalSteps: 4,
        completedStepIndices: [],
        createdAt: "2026-10-26T10:00:00.000Z",
        updatedAt: "2026-10-26T10:02:00.000Z",
      });

      render(
        <QueryClientProvider client={testQueryClient}>
          <WorkoutModal workout={sampleModalWorkout} onClose={() => {}} />
        </QueryClientProvider>
      );

      // Wait for active-session query to settle
      await waitFor(() => {
        expect(testQueryClient.getQueryData(["active-session"])).toBeTruthy();
      });

      // Click Start button on the new workout ("Core Crusher Planks")
      const startBtn = screen.getByRole("button", { name: /start/i });
      fireEvent.click(startBtn);

      // Warning dialog should appear
      const dialog = await screen.findByRole("alertdialog");
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText("Active Workout In Progress")).toBeInTheDocument();
      expect(screen.getByText(/Push-Up Blast/i)).toBeInTheDocument();

      // Verify startSession was NOT called yet
      expect(api.startSession).not.toHaveBeenCalled();

      // Click "Keep Current Workout" (cancel button)
      const cancelBtn = screen.getByTestId("cancel-abandon-btn");
      fireEvent.click(cancelBtn);

      // Dialog should close
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

      // Neither startSession nor abandonSession was ever dispatched
      expect(api.startSession).not.toHaveBeenCalled();
      expect(api.abandonSession).not.toHaveBeenCalled();
    });

    it("confirms and starts new session when user accepts the abandonment warning", async () => {
      vi.mocked(api.getActiveSession).mockResolvedValue({
        id: "sess-prior-1",
        userId: "u-1",
        workoutId: "w-prior-99",
        status: "IN_PROGRESS",
        startedAt: "2026-10-26T10:00:00.000Z",
        endedAt: null,
        durationSeconds: 120,
        currentStepIndex: 1,
        workoutTitle: "Push-Up Blast",
        workoutCalories: 150,
        totalSteps: 4,
        completedStepIndices: [],
        createdAt: "2026-10-26T10:00:00.000Z",
        updatedAt: "2026-10-26T10:02:00.000Z",
      });

      vi.mocked(api.startSession).mockResolvedValue({
        id: "sess-new-2",
        userId: "u-1",
        workoutId: sampleModalWorkout.id,
        status: "IN_PROGRESS",
        startedAt: new Date().toISOString(),
        endedAt: null,
        durationSeconds: 0,
        currentStepIndex: 0,
        workoutTitle: sampleModalWorkout.title,
        workoutCalories: sampleModalWorkout.calories,
        totalSteps: sampleModalWorkout.steps?.length || 0,
        completedStepIndices: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      render(
        <QueryClientProvider client={testQueryClient}>
          <WorkoutModal workout={sampleModalWorkout} onClose={() => {}} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(testQueryClient.getQueryData(["active-session"])).toBeTruthy();
      });

      // Click Start
      const startBtn = screen.getByRole("button", { name: /start/i });
      fireEvent.click(startBtn);

      // Dialog should appear
      await screen.findByRole("alertdialog");

      // Click "Start New Workout" (confirm button)
      const confirmBtn = screen.getByTestId("confirm-abandon-btn");
      fireEvent.click(confirmBtn);

      // Dialog closes and startSession is triggered with new workout ID
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      await waitFor(() => {
        expect(api.startSession).toHaveBeenCalledWith({ workoutId: sampleModalWorkout.id });
      });
    });
  });
});
