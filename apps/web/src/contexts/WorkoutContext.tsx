import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import {
  useQuery,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
  QueryClientContext,
} from "@tanstack/react-query";
import { Workout, defaultWorkouts, fitnessTips, FitnessTip } from "@/data/workouts";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "sonner";

export type { FitnessTip };

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
  tips: FitnessTip[];
  addTip: (tip: FitnessTip) => void;
  updateTip: (index: number, tip: FitnessTip) => void;
  deleteTip: (index: number) => void;
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
            return validWorkouts.map((w) => {
              const def = defaultWorkouts.find((d) => d.id === w.id);
              if (def) {
                return { ...w, image: def.image };
              }
              return w;
            });
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

  // Tips state persisted in localStorage
  const [tips, setTips] = useState<FitnessTip[]>(() => {
    if (typeof window === "undefined" || !window.localStorage) return fitnessTips;
    try {
      const saved = localStorage.getItem("jerai_custom_tips");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return fitnessTips;
  });

  const addTip = (newTip: FitnessTip) => {
    setTips((prev) => {
      const next = [newTip, ...prev];
      try {
        localStorage.setItem("jerai_custom_tips", JSON.stringify(next));
      } catch {
        // quota safety
      }
      return next;
    });
    toast.success("New protocol tip published successfully!");
  };

  const updateTip = (index: number, updatedTip: FitnessTip) => {
    setTips((prev) => {
      const next = [...prev];
      next[index] = updatedTip;
      try {
        localStorage.setItem("jerai_custom_tips", JSON.stringify(next));
      } catch {
        // quota safety
      }
      return next;
    });
    toast.success("Protocol tip updated!");
  };

  const deleteTip = (index: number) => {
    setTips((prev) => {
      const next = prev.filter((_, i) => i !== index);
      try {
        localStorage.setItem("jerai_custom_tips", JSON.stringify(next));
      } catch {
        // quota safety
      }
      return next;
    });
    toast.success("Protocol tip removed");
  };

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
      // Guard against quota overflow: do not serialize massive Base64 strings to localStorage
      const safeWorkouts = localWorkouts.map((w) => {
        if (w.image && w.image.startsWith("data:image/") && w.image.length > 500) {
          return { ...w, image: "/placeholder.svg" };
        }
        return w;
      });
      localStorage.setItem("workouts", JSON.stringify(safeWorkouts));
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

  // Use API response when available, otherwise fall back to localWorkouts, ensuring each default workout resolves to its unique image
  const workouts = useMemo(() => {
    const raw = apiResponse && apiResponse.length > 0 ? apiResponse : localWorkouts;
    return raw.map((w) => {
      const def = defaultWorkouts.find((d) => d.id === w.id);
      if (def) {
        return { ...w, image: def.image };
      }
      return w;
    });
  }, [apiResponse, localWorkouts]);

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
        tips,
        addTip,
        updateTip,
        deleteTip,
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
