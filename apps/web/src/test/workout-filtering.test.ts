import { describe, it, expect } from "vitest";
import { defaultWorkouts, Workout, Difficulty, BodyPart } from "@/data/workouts";

// Filter logic helper mirroring WorkoutsSection behavior
function filterWorkouts(
  workouts: Workout[],
  search: string,
  diffFilter: Difficulty | "",
  bodyFilter: BodyPart | ""
): Workout[] {
  return workouts.filter((w) => {
    const titleMatch = (w.title || "").toLowerCase().includes(search.toLowerCase());
    const descMatch = (w.description || "").toLowerCase().includes(search.toLowerCase());
    const matchSearch = !search || titleMatch || descMatch;
    const matchDiff = !diffFilter || w.difficulty === diffFilter;
    const matchBody = !bodyFilter || w.bodyPart === bodyFilter;
    return matchSearch && matchDiff && matchBody;
  });
}

describe("Workout Catalog Filtering Logic", () => {
  it("returns all workouts when no filters or search queries are applied", () => {
    const results = filterWorkouts(defaultWorkouts, "", "", "");
    expect(results).toHaveLength(defaultWorkouts.length);
  });

  it("filters workouts by search query in title (case-insensitive)", () => {
    const results = filterWorkouts(defaultWorkouts, "push-up", "", "");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((w) => w.title.toLowerCase().includes("push-up"))).toBe(true);
  });

  it("filters workouts by search query matching description", () => {
    const results = filterWorkouts(defaultWorkouts, "v-taper", "", "");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((w) => w.id === "5")).toBe(true); // Pull-ups description contains V-taper
  });

  it("filters accurately by Difficulty level", () => {
    const beginnerResults = filterWorkouts(defaultWorkouts, "", "Beginner", "");
    expect(beginnerResults.length).toBeGreaterThan(0);
    expect(beginnerResults.every((w) => w.difficulty === "Beginner")).toBe(true);

    const advancedResults = filterWorkouts(defaultWorkouts, "", "Advanced", "");
    expect(advancedResults.length).toBeGreaterThan(0);
    expect(advancedResults.every((w) => w.difficulty === "Advanced")).toBe(true);
  });

  it("filters accurately by Body Part category", () => {
    const chestWorkouts = filterWorkouts(defaultWorkouts, "", "", "Chest");
    expect(chestWorkouts.length).toBeGreaterThan(0);
    expect(chestWorkouts.every((w) => w.bodyPart === "Chest")).toBe(true);

    const cardioWorkouts = filterWorkouts(defaultWorkouts, "", "", "Cardio");
    expect(cardioWorkouts.length).toBeGreaterThan(0);
    expect(cardioWorkouts.every((w) => w.bodyPart === "Cardio")).toBe(true);
  });

  it("combines search query, difficulty, and category filters", () => {
    const results = filterWorkouts(defaultWorkouts, "dumbbell", "Intermediate", "Chest");
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("Dumbbell Bench Press");
  });

  it("returns empty array when no workouts match criteria", () => {
    const results = filterWorkouts(defaultWorkouts, "nonexistent-super-exercise-xyz", "", "");
    expect(results).toHaveLength(0);
  });

  it("gracefully handles workouts with empty or missing optional properties", () => {
    const incompleteWorkout: Workout = {
      id: "test-missing-desc",
      title: "Solo Title",
      difficulty: "Beginner",
      bodyPart: "Arms",
      image: "",
      duration: "10 min",
      calories: 50,
      videoUrl: "",
      steps: [],
      description: "",
    };

    const results = filterWorkouts([incompleteWorkout], "solo", "", "");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("test-missing-desc");

    const unmatched = filterWorkouts([incompleteWorkout], "nonexistent", "", "");
    expect(unmatched).toHaveLength(0);
  });
});
