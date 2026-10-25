import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  useQuery,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
  QueryClientContext,
} from "@tanstack/react-query";
import { Workout, defaultWorkouts } from "@/data/workouts";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "sonner";

export interface WorkoutContextType {
  workouts: Workout[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  storageError: string | null;
  mutationError: string | null;
  addWorkout: (w: Workout) => Promise<void> | void;
  updateWorkout: (w: Workout) => Promise<void> | void;
  deleteWorkout: (id: string) => Promise<void> | void;
  restoreDefaults: () => Promise<void> | void;
  refetchWorkouts: () => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

const fallbackClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function InnerWorkoutProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [storageError, setStorageError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Local state for offline / fallback / unit test support
  const [localWorkouts, setLocalWorkouts] = useState<Workout[]>(() => {
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

  // Query PostgreSQL API via TanStack Query
  const {
    data: apiResponse,
    isLoading,
    isError,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["workouts"],
    queryFn: async () => {
      const res = await api.getWorkouts({ limit: 100 });
      return res.data;
    },
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Sync to local storage for offline / backwards compatibility
  useEffect(() => {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      localStorage.setItem("workouts", JSON.stringify(localWorkouts));
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
  }, [localWorkouts]);

  // Use API response when available, otherwise fall back to localWorkouts
  const workouts = apiResponse && apiResponse.length > 0 ? apiResponse : localWorkouts;

  const addWorkout = (w: Workout) => {
    setMutationError(null);
    setLocalWorkouts((prev) => [w, ...prev]);

    api
      .createWorkout(w)
      .then(async () => {
        await queryClient.invalidateQueries({ queryKey: ["workouts"] });
        toast.success("Workout added successfully!");
      })
      .catch((err: unknown) => {
        const message =
          err instanceof ApiError ? err.message : "Failed to persist workout to server.";
        setMutationError(message);
        toast.error(message);
      });
  };

  const updateWorkout = (w: Workout) => {
    setMutationError(null);
    setLocalWorkouts((prev) => prev.map((item) => (item.id === w.id ? w : item)));

    api
      .updateWorkout(w.id, w)
      .then(async () => {
        await queryClient.invalidateQueries({ queryKey: ["workouts"] });
        toast.success("Workout updated successfully!");
      })
      .catch((err: unknown) => {
        const message =
          err instanceof ApiError ? err.message : "Failed to update workout on server.";
        setMutationError(message);
        toast.error(message);
      });
  };

  const deleteWorkout = (id: string) => {
    setMutationError(null);
    setLocalWorkouts((prev) => prev.filter((item) => item.id !== id));

    api
      .deleteWorkout(id)
      .then(async () => {
        await queryClient.invalidateQueries({ queryKey: ["workouts"] });
        toast.success("Workout deleted successfully!");
      })
      .catch((err: unknown) => {
        const message =
          err instanceof ApiError ? err.message : "Failed to delete workout on server.";
        setMutationError(message);
        toast.error(message);
      });
  };

  const restoreDefaults = () => {
    setMutationError(null);
    setLocalWorkouts(defaultWorkouts);
    setStorageError(null);
    queryClient.invalidateQueries({ queryKey: ["workouts"] }).catch(() => {});
  };

  return (
    <WorkoutContext.Provider
      value={{
        workouts,
        isLoading,
        isError,
        error: queryError as Error | null,
        storageError,
        mutationError,
        addWorkout,
        updateWorkout,
        deleteWorkout,
        restoreDefaults,
        refetchWorkouts: () => refetch(),
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const existingClient = useContext(QueryClientContext);

  if (!existingClient) {
    return (
      <QueryClientProvider client={fallbackClient}>
        <InnerWorkoutProvider>{children}</InnerWorkoutProvider>
      </QueryClientProvider>
    );
  }

  return <InnerWorkoutProvider>{children}</InnerWorkoutProvider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkoutContext() {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error("useWorkoutContext must be used within a WorkoutProvider");
  }
  return context;
}
