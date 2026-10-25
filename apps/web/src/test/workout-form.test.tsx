import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WorkoutForm from "@/components/WorkoutForm";
import { Workout } from "@/data/workouts";

describe("WorkoutForm Validation and Submission", () => {
  it("blocks submission and displays error when title is empty", () => {
    const handleSave = vi.fn();
    const handleCancel = vi.fn();

    render(<WorkoutForm onSave={handleSave} onCancel={handleCancel} />);

    // Click submit with empty form
    const submitBtn = screen.getByRole("button", { name: /add workout/i });
    fireEvent.click(submitBtn);

    expect(handleSave).not.toHaveBeenCalled();
    expect(screen.getByText(/workout title is required/i)).toBeInTheDocument();
  });

  it("blocks submission and displays error when duration is empty", () => {
    const handleSave = vi.fn();
    const handleCancel = vi.fn();

    render(<WorkoutForm onSave={handleSave} onCancel={handleCancel} />);

    // Fill title only
    const titleInput = screen.getByLabelText(/workout title/i);
    fireEvent.change(titleInput, { target: { value: "Leg Day Blitz" } });

    const submitBtn = screen.getByRole("button", { name: /add workout/i });
    fireEvent.click(submitBtn);

    expect(handleSave).not.toHaveBeenCalled();
    expect(screen.getByText(/workout duration is required/i)).toBeInTheDocument();
  });

  it("blocks submission and displays error when calories is negative", () => {
    const handleSave = vi.fn();
    const handleCancel = vi.fn();

    render(<WorkoutForm onSave={handleSave} onCancel={handleCancel} />);

    const titleInput = screen.getByLabelText(/workout title/i);
    fireEvent.change(titleInput, { target: { value: "Sprint Intervals" } });

    const durationInput = screen.getByLabelText(/duration/i);
    fireEvent.change(durationInput, { target: { value: "20 min" } });

    const caloriesInput = screen.getByLabelText(/calories/i);
    fireEvent.change(caloriesInput, { target: { value: "-50" } });

    const submitBtn = screen.getByRole("button", { name: /add workout/i });
    fireEvent.click(submitBtn);

    expect(handleSave).not.toHaveBeenCalled();
    expect(screen.getByText(/calories must be a valid positive number/i)).toBeInTheDocument();
  });

  it("blocks submission when videoUrl does not start with http or https", () => {
    const handleSave = vi.fn();
    const handleCancel = vi.fn();

    render(<WorkoutForm onSave={handleSave} onCancel={handleCancel} />);

    const titleInput = screen.getByLabelText(/workout title/i);
    fireEvent.change(titleInput, { target: { value: "Boxing Circuit" } });

    const durationInput = screen.getByLabelText(/duration/i);
    fireEvent.change(durationInput, { target: { value: "25 min" } });

    const videoInput = screen.getByLabelText(/youtube embed url/i);
    fireEvent.change(videoInput, { target: { value: "javascript:alert(1)" } });

    const submitBtn = screen.getByRole("button", { name: /add workout/i });
    fireEvent.click(submitBtn);

    expect(handleSave).not.toHaveBeenCalled();
    expect(screen.getByText(/video url must be a valid web url/i)).toBeInTheDocument();
  });

  it("successfully submits with sanitized steps when all fields are valid", () => {
    const handleSave = vi.fn();
    const handleCancel = vi.fn();

    render(<WorkoutForm onSave={handleSave} onCancel={handleCancel} />);

    fireEvent.change(screen.getByLabelText(/workout title/i), {
      target: { value: "Kettlebell Swings" },
    });
    fireEvent.change(screen.getByLabelText(/duration/i), {
      target: { value: "15 min" },
    });
    fireEvent.change(screen.getByLabelText(/calories/i), {
      target: { value: "180" },
    });
    fireEvent.change(screen.getByPlaceholderText(/step 1/i), {
      target: { value: "Hinge at hips" },
    });

    const submitBtn = screen.getByRole("button", { name: /add workout/i });
    fireEvent.click(submitBtn);

    expect(handleSave).toHaveBeenCalledTimes(1);
    const savedArg: Workout = handleSave.mock.calls[0][0];
    expect(savedArg.title).toBe("Kettlebell Swings");
    expect(savedArg.duration).toBe("15 min");
    expect(savedArg.calories).toBe(180);
    expect(savedArg.steps).toEqual(["Hinge at hips"]);
  });

  it("calls onCancel when Cancel button is clicked", () => {
    const handleSave = vi.fn();
    const handleCancel = vi.fn();

    render(<WorkoutForm onSave={handleSave} onCancel={handleCancel} />);

    const cancelBtn = screen.getByRole("button", { name: /^cancel$/i });
    fireEvent.click(cancelBtn);

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});
