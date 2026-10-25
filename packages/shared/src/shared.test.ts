import { describe, it, expect } from "vitest";
import {
  createWorkoutSchema,
  updateWorkoutSchema,
  workoutFilterQuerySchema,
  workoutIdParamSchema,
} from "./workout.schemas";

describe("Shared Workout Schemas", () => {
  const validWorkout = {
    title: "Push-Up Power",
    description: "Master the classic push-up with perfect form.",
    difficulty: "Beginner" as const,
    bodyPart: "Chest" as const,
    duration: "15 min",
    calories: 120,
    videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
    image: "/assets/workout-1.jpg",
    steps: ["Start in plank", "Lower chest", "Push back up"],
  };

  describe("createWorkoutSchema", () => {
    it("accepts valid workout payload", () => {
      const result = createWorkoutSchema.safeParse(validWorkout);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Push-Up Power");
        expect(result.data.calories).toBe(120);
        expect(result.data.steps).toHaveLength(3);
      }
    });

    it("accepts valid workout with optional id", () => {
      const result = createWorkoutSchema.safeParse({ ...validWorkout, id: "w-123" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("w-123");
      }
    });

    it("allows empty videoUrl", () => {
      const result = createWorkoutSchema.safeParse({ ...validWorkout, videoUrl: "" });
      expect(result.success).toBe(true);
    });

    it("rejects invalid videoUrl format", () => {
      const result = createWorkoutSchema.safeParse({ ...validWorkout, videoUrl: "not-a-url" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("videoUrl");
      }
    });

    it("rejects empty title", () => {
      const result = createWorkoutSchema.safeParse({ ...validWorkout, title: "   " });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("title");
      }
    });

    it("rejects negative calories", () => {
      const result = createWorkoutSchema.safeParse({ ...validWorkout, calories: -10 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("calories");
      }
    });

    it("rejects non-integer calories", () => {
      const result = createWorkoutSchema.safeParse({ ...validWorkout, calories: 120.5 });
      expect(result.success).toBe(false);
    });

    it("rejects invalid difficulty", () => {
      const result = createWorkoutSchema.safeParse({ ...validWorkout, difficulty: "Extreme" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("difficulty");
      }
    });

    it("rejects invalid bodyPart", () => {
      const result = createWorkoutSchema.safeParse({ ...validWorkout, bodyPart: "Brain" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("bodyPart");
      }
    });

    it("rejects empty steps array", () => {
      const result = createWorkoutSchema.safeParse({ ...validWorkout, steps: [] });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("steps");
      }
    });

    it("rejects empty step string inside steps array", () => {
      const result = createWorkoutSchema.safeParse({ ...validWorkout, steps: ["  "] });
      expect(result.success).toBe(false);
    });
  });

  describe("updateWorkoutSchema", () => {
    it("accepts single field update", () => {
      const result = updateWorkoutSchema.safeParse({ title: "Updated Title" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Updated Title");
      }
    });

    it("rejects empty object update", () => {
      const result = updateWorkoutSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("validates fields when provided", () => {
      const result = updateWorkoutSchema.safeParse({ calories: -50 });
      expect(result.success).toBe(false);
    });
  });

  describe("workoutFilterQuerySchema", () => {
    it("applies default page and limit", () => {
      const result = workoutFilterQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50);
      }
    });

    it("coerces string page and limit to numbers", () => {
      const result = workoutFilterQuerySchema.safeParse({ page: "2", limit: "25" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(25);
      }
    });

    it("clamps limit exceeding 100", () => {
      const result = workoutFilterQuerySchema.safeParse({ limit: 101 });
      expect(result.success).toBe(false);
    });

    it("rejects negative page", () => {
      const result = workoutFilterQuerySchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });
  });

  describe("workoutIdParamSchema", () => {
    it("accepts valid id", () => {
      const result = workoutIdParamSchema.safeParse({ id: "1" });
      expect(result.success).toBe(true);
    });

    it("rejects whitespace id", () => {
      const result = workoutIdParamSchema.safeParse({ id: "   " });
      expect(result.success).toBe(false);
    });
  });
});
