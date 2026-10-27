import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { WorkoutProvider, useWorkoutContext } from "@/contexts/WorkoutContext";
import { defaultWorkouts, Workout } from "@/data/workouts";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <WorkoutProvider>{children}</WorkoutProvider>
);

const sampleCustomWorkout: Workout = {
  id: "custom-1",
  title: "Incline Push-Up",
  difficulty: "Beginner",
  bodyPart: "Chest",
  image: "https://example.com/image.jpg",
  duration: "12 min",
  calories: 90,
  videoUrl: "https://www.youtube.com/embed/test",
  description: "Great for building lower chest",
  steps: ["Elevate hands on bench", "Lower chest", "Press up"],
};

describe("WorkoutContext State & Persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("initializes with defaultWorkouts when localStorage is empty", () => {
    const { result } = renderHook(() => useWorkoutContext(), { wrapper });
    expect(result.current.workouts).toHaveLength(defaultWorkouts.length);
    expect(result.current.storageError).toBeNull();
  });

  it("loads existing workouts from localStorage on mount", () => {
    localStorage.setItem("workouts", JSON.stringify([sampleCustomWorkout]));
    const { result } = renderHook(() => useWorkoutContext(), { wrapper });
    expect(result.current.workouts).toHaveLength(1);
    expect(result.current.workouts[0].title).toBe("Incline Push-Up");
  });

  it("adds a new workout to the beginning of the list and persists to storage", () => {
    const { result } = renderHook(() => useWorkoutContext(), { wrapper });
    const initialCount = result.current.workouts.length;

    act(() => {
      result.current.addWorkout(sampleCustomWorkout);
    });

    expect(result.current.workouts).toHaveLength(initialCount + 1);
    expect(result.current.workouts[0].id).toBe("custom-1");

    const saved = JSON.parse(localStorage.getItem("workouts") || "[]");
    expect(saved[0].title).toBe("Incline Push-Up");
  });

  it("updates an existing workout in place", () => {
    const { result } = renderHook(() => useWorkoutContext(), { wrapper });
    const targetId = defaultWorkouts[0].id;

    const updatedData: Workout = {
      ...defaultWorkouts[0],
      title: "Modified Push-Up Power Extra",
      calories: 350,
    };

    act(() => {
      result.current.updateWorkout(updatedData);
    });

    const found = result.current.workouts.find((w) => w.id === targetId);
    expect(found?.title).toBe("Modified Push-Up Power Extra");
    expect(found?.calories).toBe(350);

    const saved = JSON.parse(localStorage.getItem("workouts") || "[]");
    const savedFound = saved.find((w: Workout) => w.id === targetId);
    expect(savedFound.title).toBe("Modified Push-Up Power Extra");
  });

  it("deletes a workout by id and updates storage", () => {
    const { result } = renderHook(() => useWorkoutContext(), { wrapper });
    const targetId = defaultWorkouts[0].id;
    const initialCount = result.current.workouts.length;

    act(() => {
      result.current.deleteWorkout(targetId);
    });

    expect(result.current.workouts).toHaveLength(initialCount - 1);
    expect(result.current.workouts.some((w) => w.id === targetId)).toBe(false);

    const saved = JSON.parse(localStorage.getItem("workouts") || "[]");
    expect(saved.some((w: Workout) => w.id === targetId)).toBe(false);
  });

  it("restores defaults cleanly via restoreDefaults without throwing", () => {
    localStorage.setItem("workouts", JSON.stringify([sampleCustomWorkout]));
    const { result } = renderHook(() => useWorkoutContext(), { wrapper });
    expect(result.current.workouts).toHaveLength(1);

    act(() => {
      result.current.restoreDefaults();
    });

    expect(result.current.workouts).toHaveLength(defaultWorkouts.length);
    expect(result.current.storageError).toBeNull();
  });

  it("safely handles malformed stored JSON by creating a corrupted backup and falling back to defaults", () => {
    const badJson = "INVALID_JSON_{{}[";
    localStorage.setItem("workouts", badJson);

    const warnSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useWorkoutContext(), { wrapper });

    expect(result.current.workouts).toHaveLength(defaultWorkouts.length);
    expect(localStorage.getItem("workouts_corrupted_backup")).toBe(badJson);
    warnSpy.mockRestore();
  });

  it("safely captures QuotaExceededError and sets user-friendly storageError state", () => {
    const { result } = renderHook(() => useWorkoutContext(), { wrapper });

    const quotaError = new DOMException("The quota has been exceeded.", "QuotaExceededError");
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw quotaError;
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    act(() => {
      result.current.addWorkout(sampleCustomWorkout);
    });

    expect(result.current.storageError).toContain("Browser storage quota exceeded");

    setItemSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("safely handles storage read exceptions (e.g. SecurityError in private browsing) by falling back to defaults", () => {
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Access is denied", "SecurityError");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useWorkoutContext(), { wrapper });

    expect(result.current.workouts).toHaveLength(defaultWorkouts.length);

    getItemSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
