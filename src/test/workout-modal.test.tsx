import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import WorkoutModal from "@/components/WorkoutModal";
import { Workout } from "@/data/workouts";

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
});
