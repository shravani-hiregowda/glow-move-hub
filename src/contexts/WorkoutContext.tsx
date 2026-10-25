import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Workout, defaultWorkouts } from "@/data/workouts";

export interface WorkoutContextType {
  workouts: Workout[];
  storageError: string | null;
  addWorkout: (w: Workout) => void;
  updateWorkout: (w: Workout) => void;
  deleteWorkout: (id: string) => void;
  restoreDefaults: () => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [storageError, setStorageError] = useState<string | null>(null);

  const [workouts, setWorkouts] = useState<Workout[]>(() => {
    if (typeof window === "undefined" || !window.localStorage) {
      return defaultWorkouts;
    }
    try {
      const saved = localStorage.getItem("workouts");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validWorkouts = parsed.filter(
            (w): w is Workout =>
              Boolean(w && typeof w === "object" && typeof w.id === "string" && typeof w.title === "string")
          );
          if (validWorkouts.length > 0) {
            return validWorkouts;
          }
        }
        try {
          localStorage.setItem("workouts_corrupted_backup", saved);
        } catch {
          // ignore backup failure if quota blocked
        }
        console.warn("Stored workouts data was not a valid array; created backup in workouts_corrupted_backup");
      }
    } catch (e) {
      try {
        const saved = localStorage.getItem("workouts");
        if (saved) {
          localStorage.setItem("workouts_corrupted_backup", saved);
        }
      } catch {
        // ignore backup failure if storage blocked
      }
      console.error("Failed to read workouts from localStorage; created backup if possible", e);
    }
    return defaultWorkouts;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      localStorage.setItem("workouts", JSON.stringify(workouts));
      setStorageError(null);
    } catch (err: unknown) {
      const isQuotaError =
        err instanceof DOMException &&
        (err.name === "QuotaExceededError" ||
          err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
          err.code === 22 ||
          err.code === 1014);
      const msg = isQuotaError
        ? "Browser storage quota exceeded. Custom workout images may be too large to save locally."
        : "Failed to persist workouts to browser storage.";
      console.error(msg, err);
      setStorageError(msg);
    }
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

  const restoreDefaults = () => {
    setWorkouts(defaultWorkouts);
    setStorageError(null);
  };

  return (
    <WorkoutContext.Provider
      value={{ workouts, storageError, addWorkout, updateWorkout, deleteWorkout, restoreDefaults }}
    >
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
