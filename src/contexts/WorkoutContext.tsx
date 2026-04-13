import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Workout, defaultWorkouts } from "@/data/workouts";

interface WorkoutContextType {
  workouts: Workout[];
  addWorkout: (w: Workout) => void;
  updateWorkout: (w: Workout) => void;
  deleteWorkout: (id: string) => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [workouts, setWorkouts] = useState<Workout[]>(() => {
    const saved = localStorage.getItem("workouts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Force update if the saved workouts are deeply outdated (missing the new categories)
        if (Array.isArray(parsed) && parsed.length < defaultWorkouts.length && !parsed.some(w => w.bodyPart === "Cardio")) {
          return defaultWorkouts;
        }
        // Force update Biceps category for the Bicep Curls if it is still old
        const updatedParsed = parsed.map(w => w.title === "Bicep Curls" && w.bodyPart === "Arms" ? { ...w, bodyPart: "Biceps" } : w);
        return updatedParsed as Workout[];
      } catch (e) {
        console.error("Failed to parse workouts from localStorage");
      }
    }
    return defaultWorkouts;
  });

  useEffect(() => {
    localStorage.setItem("workouts", JSON.stringify(workouts));
  }, [workouts]);

  const addWorkout = (w: Workout) => {
    setWorkouts((prev) => [w, ...prev]);
  };

  const updateWorkout = (w: Workout) => {
    setWorkouts((prev) => prev.map((item) => (item.id === w.id ? w : item)));
  };

  const deleteWorkout = (id: string) => {
    setWorkouts((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <WorkoutContext.Provider value={{ workouts, addWorkout, updateWorkout, deleteWorkout }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkoutContext() {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error("useWorkoutContext must be used within a WorkoutProvider");
  }
  return context;
}
