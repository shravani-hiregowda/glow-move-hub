import { useState, useEffect, useRef, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Clock,
  Flame,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Check,
  AlertCircle,
  Flag,
  Dumbbell,
  Layers,
  Activity,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
  QueryClientContext,
} from "@tanstack/react-query";
import type { Workout } from "@/data/workouts";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { createContext } from "react";
import type { UserDto } from "@jerai/shared";

/**
 * Synthesizes a crisp athletic interval completion chime using Web Audio API.
 * Requires zero external audio assets, works offline, and plays instantly.
 */
function playIntervalChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Harmonic chime tone 1: A5 (880Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Harmonic chime tone 2: D6 (1174.66Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1174.66, now + 0.1);
    gain2.gain.setValueAtTime(0.28, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.5);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch {
    // Autoplay restrictions or headless test environments
  }
}

const fallbackQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const workoutProtocolSpecs: Record<
  string,
  { primary: string; secondary: string; equipment: string; rpe: string; sets: string }
> = {
  Chest: {
    primary: "Pectoralis Major & Minor",
    secondary: "Anterior Deltoids, Triceps",
    equipment: "Dumbbells, Barbell, Adjustable Bench",
    rpe: "RPE 8.0 - 8.5",
    sets: "3 - 4 Sets × 8-12 Reps",
  },
  Back: {
    primary: "Latissimus Dorsi, Rhomboids",
    secondary: "Biceps Brachii, Posterior Deltoid",
    equipment: "Pull-Up Rig, Cable Pulley, V-Bar",
    rpe: "RPE 8.5",
    sets: "4 Sets × 8-10 Reps",
  },
  Legs: {
    primary: "Quadriceps, Gluteus Maximus",
    secondary: "Hamstrings, Calves, Core",
    equipment: "Olympic Barbell, 45° Sled, Rack",
    rpe: "RPE 9.0",
    sets: "4 Sets × 10-12 Reps",
  },
  Arms: {
    primary: "Biceps Brachii, Triceps Lateral",
    secondary: "Brachialis, Wrist Flexors",
    equipment: "Hex Dumbbells, Cable Station",
    rpe: "RPE 7.5 - 8.0",
    sets: "3 Sets × 12-15 Reps",
  },
  Core: {
    primary: "Rectus Abdominis, Obliques",
    secondary: "Transverse Abdominis, Hip Flexors",
    equipment: "Floor Mat, Medicine Ball",
    rpe: "RPE 8.0",
    sets: "3 - 4 Rounds × 45-60s",
  },
  "Full Body": {
    primary: "Total Body Kinetic Chain",
    secondary: "Cardiovascular Engine",
    equipment: "Barbell, Bumper Plates, Kettlebell",
    rpe: "RPE 9.0",
    sets: "4 - 5 Complex Rounds",
  },
  Shoulders: {
    primary: "Deltoids (Medial & Anterior)",
    secondary: "Upper Trapezius, Triceps",
    equipment: "Dumbbells, Dual Cable Station",
    rpe: "RPE 8.0",
    sets: "4 Sets × 10-15 Reps",
  },
  Triceps: {
    primary: "Triceps Long & Lateral Heads",
    secondary: "Anconeus, Forearms",
    equipment: "Cable Rope Attachment, EZ Bar",
    rpe: "RPE 7.5",
    sets: "3 - 4 Sets × 12 Reps",
  },
  Biceps: {
    primary: "Biceps Short & Long Heads",
    secondary: "Brachioradialis",
    equipment: "Hex Dumbbells, Preacher Bench",
    rpe: "RPE 7.5",
    sets: "3 - 4 Sets × 10-12 Reps",
  },
  "Fat Loss": {
    primary: "Metabolic Full-Body Conditioning",
    secondary: "Cardiorespiratory Capacity",
    equipment: "Battle Ropes, Sled, Kettlebell",
    rpe: "RPE 9.5 (High Output)",
    sets: "5 High-Output Intervals",
  },
  Cardio: {
    primary: "Aerobic & Anaerobic Engine",
    secondary: "Lower-Body Muscular Endurance",
    equipment: "Track, Concept2 Rower, Jump Rope",
    rpe: "RPE 8.5",
    sets: "8 Sprint Intervals / Steady Pace",
  },
};

interface WorkoutModalProps {
  workout: Workout | null;
  onClose: () => void;
}

function InnerWorkoutModal({ workout, onClose }: WorkoutModalProps) {
  const queryClient = useQueryClient();

  const getInitialTime = (durationStr?: string) => {
    if (!durationStr) return 60;
    const match = durationStr.match(/\d+/);
    return match ? parseInt(match[0], 10) * 60 : 60;
  };

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [timerLeft, setTimerLeft] = useState(60);
  const [maxTime, setMaxTime] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isCompletedState, setIsCompletedState] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);

  // Sync state when a new workout is opened
  useEffect(() => {
    if (workout) {
      const timeInSecs = getInitialTime(workout.duration);
      setTimerLeft(timeInSecs);
      setMaxTime(timeInSecs);
      setTimerActive(false);
      setCompletedSteps(new Set());
      setActiveSessionId(null);
      setIsCompletedState(false);
      setSessionStartTime(null);
      setShowAbandonConfirm(false);
    }
  }, [workout?.id]);

  // Query active server session if authenticated
  const { data: serverActiveSession } = useQuery({
    queryKey: ["active-session"],
    queryFn: async () => {
      try {
        const sess = await api.getActiveSession();
        return sess ?? null;
      } catch {
        return null;
      }
    },
    enabled: Boolean(workout),
    staleTime: 1000 * 5,
  });

  // Restore active server session if it matches the current workout
  useEffect(() => {
    if (serverActiveSession && workout && serverActiveSession.workoutId === workout.id) {
      setActiveSessionId(serverActiveSession.id);
      if (serverActiveSession.completedStepIndices) {
        setCompletedSteps(new Set(serverActiveSession.completedStepIndices));
      }
      // Robust elapsed calculation across page refreshes
      const startedAtMs = new Date(serverActiveSession.startedAt).getTime();
      setSessionStartTime(startedAtMs);
      const elapsed = Math.max(
        serverActiveSession.durationSeconds,
        Math.floor((Date.now() - startedAtMs) / 1000)
      );
      const remaining = Math.max(0, maxTime - elapsed);
      setTimerLeft(remaining);
      setTimerActive(true);
    }
  }, [serverActiveSession, workout, maxTime]);

  // Mutations
  const startSessionMutation = useMutation({
    mutationFn: async (workoutId: string) => {
      return await api.startSession({ workoutId });
    },
    onSuccess: (session) => {
      setActiveSessionId(session.id);
      setSessionStartTime(Date.now());
      queryClient.invalidateQueries({ queryKey: ["active-session"] });
      queryClient.invalidateQueries({ queryKey: ["workout-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["workout-progress-summary"] });
      toast.success("Workout session started! Timer running.");
    },
    onError: () => {
      // Gracefully continue with client-side focus mode
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({
      sessionId,
      currentStepIndex,
      completedStepIndices,
      durationSeconds,
    }: {
      sessionId: string;
      currentStepIndex?: number;
      completedStepIndices?: number[];
      durationSeconds?: number;
    }) => {
      return await api.updateSessionProgress(sessionId, {
        currentStepIndex,
        completedStepIndices,
        durationSeconds,
      });
    },
  });

  const completeSessionMutation = useMutation({
    mutationFn: async ({
      sessionId,
      durationSeconds,
      completedStepIndices,
    }: {
      sessionId: string;
      durationSeconds: number;
      completedStepIndices: number[];
    }) => {
      return await api.completeSession(sessionId, {
        durationSeconds,
        completedStepIndices,
      });
    },
    onSuccess: (session) => {
      setIsCompletedState(true);
      setTimerActive(false);
      queryClient.invalidateQueries({ queryKey: ["active-session"] });
      queryClient.invalidateQueries({ queryKey: ["workout-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["workout-progress-summary"] });
      toast.success(`Workout Completed! ${session.workoutCalories} calories logged.`);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to complete workout session.");
    },
  });

  const abandonSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await api.abandonSession(sessionId);
    },
    onSuccess: () => {
      setActiveSessionId(null);
      setTimerActive(false);
      queryClient.invalidateQueries({ queryKey: ["active-session"] });
      queryClient.invalidateQueries({ queryKey: ["workout-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["workout-progress-summary"] });
      toast.info("Workout session cancelled.");
    },
  });

  // Calculate robust elapsed duration
  const getElapsedSeconds = () => {
    if (sessionStartTime) {
      return Math.max(0, Math.floor((Date.now() - sessionStartTime) / 1000));
    }
    return Math.max(0, maxTime - timerLeft);
  };

  // Timer interval with Web Audio interval completion cue
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timerLeft > 0) {
      interval = setInterval(() => {
        setTimerLeft((t) => t - 1);
      }, 1000);
    } else if (timerLeft === 0) {
      if (timerActive) {
        if (!isSoundMuted) {
          playIntervalChime();
        }
        toast.success("Interval complete! Take your recovery rest.");
      }
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerLeft, isSoundMuted]);

  const toggleStep = (index: number) => {
    const newSet = new Set(completedSteps);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setCompletedSteps(newSet);

    // Sync with server if session is active
    if (activeSessionId) {
      const elapsed = getElapsedSeconds();
      updateProgressMutation.mutate({
        sessionId: activeSessionId,
        currentStepIndex: index,
        completedStepIndices: Array.from(newSet),
        durationSeconds: elapsed,
      });
    }
  };

  const handleStartTimer = () => {
    if (timerLeft === 0) {
      setTimerLeft(maxTime);
    }
    const nextState = !timerActive;

    // Check if starting a new workout session when a DIFFERENT session is already active
    if (nextState && !activeSessionId && workout) {
      if (
        serverActiveSession &&
        serverActiveSession.workoutId !== workout.id &&
        serverActiveSession.status === "IN_PROGRESS"
      ) {
        setShowAbandonConfirm(true);
        return;
      }

      setTimerActive(true);
      setSessionStartTime(Date.now());
      startSessionMutation.mutate(workout.id);
      return;
    }

    setTimerActive(nextState);
  };

  const handleConfirmStartNewWorkout = () => {
    setShowAbandonConfirm(false);
    if (workout) {
      setTimerActive(true);
      setSessionStartTime(Date.now());
      startSessionMutation.mutate(workout.id);
    }
  };

  const handleCancelStartNewWorkout = () => {
    setShowAbandonConfirm(false);
  };

  const handleCompleteWorkout = () => {
    const elapsed = getElapsedSeconds();
    const completedArr = Array.from(completedSteps);

    if (activeSessionId) {
      completeSessionMutation.mutate({
        sessionId: activeSessionId,
        durationSeconds: elapsed,
        completedStepIndices: completedArr,
      });
    } else {
      setIsCompletedState(true);
      setTimerActive(false);
      toast.success("Workout completed!");
    }
  };

  const handleAbandonWorkout = () => {
    if (activeSessionId) {
      abandonSessionMutation.mutate(activeSessionId);
    } else {
      setTimerActive(false);
      setTimerLeft(maxTime);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleClose = () => {
    onClose();
  };

  const timerProgress = maxTime > 0 ? ((maxTime - timerLeft) / maxTime) * 100 : 0;

  return (
    <AnimatePresence>
      {workout && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-background/90 backdrop-blur-md"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card border border-border soft-shadow"
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-xl glass flex items-center justify-center text-foreground hover:text-primary transition-colors hover:scale-105 active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Video */}
            <div className="aspect-video bg-muted rounded-t-3xl overflow-hidden">
              <iframe
                src={workout.videoUrl}
                title={workout.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Content */}
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  {workout.difficulty}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent/10 text-accent border border-accent/20">
                  {workout.bodyPart}
                </span>
                {activeSessionId && !isCompletedState && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Session Active
                  </span>
                )}
                {isCompletedState && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/40 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Completed
                  </span>
                )}
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
                {workout.title}
              </h2>
              <p className="text-muted-foreground mb-6">{workout.description}</p>

              <div className="flex gap-6 mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-5 h-5 text-primary" /> {workout.duration}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Flame className="w-5 h-5 text-primary" /> {workout.calories} kcal
                </div>
              </div>

              {/* Protocol Specifications Panel */}
              {(() => {
                const specs = workoutProtocolSpecs[workout.bodyPart] || workoutProtocolSpecs["Full Body"];
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-8">
                    <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/70">
                      <span className="text-[10px] font-semibold tracking-wider uppercase text-primary mb-1 flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Target Muscles
                      </span>
                      <div className="text-xs font-semibold text-foreground">{specs.primary}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{specs.secondary}</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/70">
                      <span className="text-[10px] font-semibold tracking-wider uppercase text-primary mb-1 flex items-center gap-1">
                        <Dumbbell className="w-3 h-3" /> Equipment
                      </span>
                      <div className="text-xs font-semibold text-foreground">{specs.equipment}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Commercial Standard</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/70">
                      <span className="text-[10px] font-semibold tracking-wider uppercase text-primary mb-1 flex items-center gap-1">
                        <Activity className="w-3 h-3" /> Target RPE & Sets
                      </span>
                      <div className="text-xs font-semibold text-foreground">{specs.rpe}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{specs.sets}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Congratulatory completion banner */}
              {isCompletedState && (
                <div className="mb-6 p-4 rounded-2xl bg-primary/10 border border-primary/30 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground">Session Completed!</h4>
                    <p className="text-sm text-muted-foreground">
                      Great job! Your progress and calories burned have been saved.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col lg:flex-row gap-8">
                {/* Steps Section */}
                <div className="lg:w-2/3">
                  <h3 className="font-display font-semibold text-xl text-foreground mb-4">
                    Focus Mode Instructions
                  </h3>
                  <div className="space-y-3">
                    {workout.steps.map((step, i) => {
                      const isCompleted = completedSteps.has(i);
                      return (
                        <motion.button
                          key={i}
                          onClick={() => toggleStep(i)}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={`w-full flex items-start gap-4 p-5 rounded-2xl border transition-all text-left group ${
                            isCompleted
                              ? "bg-primary/5 border-primary/20 opacity-60"
                              : "bg-card border-border hover:border-primary/40 soft-shadow"
                          }`}
                        >
                          <CheckCircle2
                            className={`w-6 h-6 mt-0.5 shrink-0 transition-colors ${
                              isCompleted
                                ? "text-primary"
                                : "text-muted-foreground group-hover:text-primary/70"
                            }`}
                          />
                          <span
                            className={`text-base transition-all ${
                              isCompleted ? "text-muted-foreground line-through" : "text-foreground"
                            }`}
                          >
                            {step}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Workout Timer & Session Controls */}
                <div className="lg:w-1/3">
                  <div className="sticky top-6 p-6 rounded-3xl bg-secondary/30 border border-border flex flex-col items-center shadow-lg">
                    <h3 className="font-display font-semibold text-lg text-foreground mb-1 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" /> Workout Timer
                    </h3>
                    <p
                      className="text-sm text-muted-foreground mb-8 text-center"
                      title={workout.duration}
                    >
                      Time allotted: <strong>{workout.duration}</strong>
                    </p>

                    <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                      <svg className="w-full h-full transform -rotate-90 drop-shadow-xl ">
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          fill="none"
                          className="stroke-secondary"
                          strokeWidth="8"
                        />
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          fill="none"
                          className="stroke-primary"
                          strokeWidth="8"
                          strokeDasharray="553"
                          strokeDashoffset={553 - (553 * timerProgress) / 100}
                          strokeLinecap="round"
                          style={{ transition: "stroke-dashoffset 1s linear" }}
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <div
                          className={`font-display font-bold text-5xl tabular-nums ${
                            timerLeft === 0 ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {formatTime(timerLeft)}
                        </div>
                        {timerLeft === 0 && (
                          <span className="text-xs text-primary font-bold mt-1 uppercase tracking-widest">
                            Done!
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 w-full">
                      <div className="flex gap-3 w-full">
                        <button
                          onClick={handleStartTimer}
                          className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 ${
                            timerActive
                              ? "bg-secondary text-foreground hover:bg-secondary/80 border border-border/80"
                              : "bg-primary text-primary-foreground hover:bg-primary/90"
                          }`}
                        >
                          {timerActive ? (
                            <>
                              <Pause className="w-5 h-5" /> Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-5 h-5" />{" "}
                              {timerLeft === 0 ? "Restart" : "Start"}
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsSoundMuted(!isSoundMuted)}
                          className={`p-4 rounded-2xl border transition-colors shadow-md active:scale-95 cursor-pointer ${
                            isSoundMuted
                              ? "bg-secondary/40 text-muted-foreground border-border"
                              : "bg-secondary text-primary border-primary/30 hover:bg-secondary/80"
                          }`}
                          title={isSoundMuted ? "Unmute Interval Audio Chime" : "Mute Interval Audio Chime"}
                        >
                          {isSoundMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => {
                            setTimerActive(false);
                            setTimerLeft(maxTime);
                          }}
                          className="p-4 rounded-2xl bg-secondary border border-border text-foreground hover:bg-secondary/80 transition-colors shadow-md active:scale-95 cursor-pointer"
                          title="Reset Timer"
                        >
                          <RotateCcw className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Explicit session completion and abandonment actions */}
                      {(activeSessionId || timerActive || completedSteps.size > 0) &&
                        !isCompletedState && (
                          <div className="flex flex-col gap-2 w-full mt-2 pt-3 border-t border-border/60">
                            <button
                              onClick={handleCompleteWorkout}
                              disabled={completeSessionMutation.isPending}
                              data-testid="complete-workout-btn"
                              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                            >
                              <Check className="w-4 h-4" /> Complete Workout
                            </button>

                            {activeSessionId && (
                              <button
                                onClick={handleAbandonWorkout}
                                disabled={abandonSessionMutation.isPending}
                                data-testid="abandon-workout-btn"
                                className="w-full py-2 px-3 rounded-xl text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Flag className="w-3.5 h-3.5" /> Abandon Session
                              </button>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {showAbandonConfirm && (
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="abandon-dialog-title"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in-0 duration-200"
            >
              <div className="bg-card text-card-foreground border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center gap-3 text-amber-500">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <h3 id="abandon-dialog-title" className="text-lg font-bold text-foreground">
                    Active Workout In Progress
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You already have an active workout in progress for{" "}
                  <strong className="text-foreground">
                    {serverActiveSession?.workoutTitle || "another workout"}
                  </strong>
                  . Starting this workout will cancel your previous session. Do you want to continue?
                </p>
                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={handleCancelStartNewWorkout}
                    data-testid="cancel-abandon-btn"
                    className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted text-foreground transition-colors"
                  >
                    Keep Current Workout
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmStartNewWorkout}
                    data-testid="confirm-abandon-btn"
                    className="px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors shadow-sm"
                  >
                    Start New Workout
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function WorkoutModal(props: WorkoutModalProps) {
  const existingClient = useContext(QueryClientContext);
  if (!existingClient) {
    return (
      <QueryClientProvider client={fallbackQueryClient}>
        <InnerWorkoutModal {...props} />
      </QueryClientProvider>
    );
  }
  return <InnerWorkoutModal {...props} />;
}
