import { useState } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  Clock,
  Flame,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Activity,
  Calendar,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkoutContext } from "@/contexts/WorkoutContext";
import Navbar from "@/components/Navbar";
import WorkoutModal from "@/components/WorkoutModal";
import type { Workout } from "@/data/workouts";
import type { WorkoutSessionDto, WorkoutSessionStatus } from "@jerai/shared";

export default function ProgressDashboard() {
  const { isDark, toggle } = useTheme();
  let user = null;
  try {
    const auth = useAuth();
    user = auth.user;
  } catch {
    user = null;
  }
  let workouts: Workout[] = [];
  try {
    const ctx = useWorkoutContext();
    workouts = ctx.workouts;
  } catch {
    workouts = [];
  }
  const [statusFilter, setStatusFilter] = useState<WorkoutSessionStatus | "ALL">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedWorkoutForModal, setSelectedWorkoutForModal] = useState<Workout | null>(null);

  // Fetch real-time progress summary
  const {
    data: summary,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["workout-progress-summary"],
    queryFn: () => api.getSessionSummary(),
    staleTime: 1000 * 10,
  });

  // Fetch paginated history list
  const {
    data: historyData,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["workout-sessions", currentPage, statusFilter],
    queryFn: () =>
      api.getSessions({
        page: currentPage,
        limit: 10,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      }),
    staleTime: 1000 * 10,
  });

  const formatDuration = (totalSeconds: number) => {
    if (!totalSeconds || totalSeconds < 60) {
      return `${totalSeconds || 0}s`;
    }
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hours}h ${remMins}m`;
    }
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
  };

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  const handleResumeWorkout = (activeSession: WorkoutSessionDto) => {
    const matched = workouts.find((w) => w.id === activeSession.workoutId);
    if (matched) {
      setSelectedWorkoutForModal(matched);
    } else if (activeSession.workout) {
      setSelectedWorkoutForModal(activeSession.workout as unknown as Workout);
    }
  };

  const sessions = historyData?.data || [];
  const pagination = historyData?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        isDark={isDark}
        onToggleTheme={toggle}
        activeSection="progress"
        onNavigate={() => {}}
      />

      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-2 text-primary font-semibold text-sm">
            <Activity className="w-4 h-4" /> Member Progress Hub
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            {user?.name ? `${user.name}'s ` : "Workout "}
            <span className="text-primary">Progress & History</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Track your fitness consistency, completed sessions, and caloric burn.
          </p>
        </motion.div>

        {/* Active Session Alert Banner (if in progress) */}
        {summary?.activeSession && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Play className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Active Workout In Progress
                </span>
                <h3 className="text-lg font-bold text-foreground">
                  {summary.activeSession.workoutTitle}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Elapsed: {formatDuration(summary.activeSession.durationSeconds)} · Started{" "}
                  {formatDate(summary.activeSession.startedAt)}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleResumeWorkout(summary.activeSession!)}
              className="py-2.5 px-5 rounded-xl font-bold text-sm gradient-primary text-primary-foreground neon-glow hover:opacity-90 flex items-center gap-2"
            >
              Resume Workout <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-6 rounded-3xl bg-card border border-border soft-shadow flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Workouts Completed</p>
              <h2 className="text-3xl font-display font-bold text-foreground">
                {isSummaryLoading ? "—" : summary?.totalWorkoutsCompleted ?? 0}
              </h2>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-3xl bg-card border border-border soft-shadow flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-cyan/10 text-cyan flex items-center justify-center shrink-0">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Training Time</p>
              <h2 className="text-3xl font-display font-bold text-foreground">
                {isSummaryLoading ? "—" : formatDuration(summary?.totalDurationSeconds || 0)}
              </h2>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-6 rounded-3xl bg-card border border-border soft-shadow flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
              <Flame className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Estimated Burn</p>
              <h2 className="text-3xl font-display font-bold text-foreground">
                {isSummaryLoading ? "—" : `${summary?.totalCaloriesBurned ?? 0} cal`}
              </h2>
            </div>
          </motion.div>
        </div>

        {/* History Section */}
        <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border soft-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-display text-xl font-bold text-foreground">Workout History</h3>
              <p className="text-sm text-muted-foreground">
                {pagination.total} session{pagination.total === 1 ? "" : "s"} recorded
              </p>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-secondary/50 border border-border text-xs font-semibold">
              {(["ALL", "COMPLETED", "IN_PROGRESS", "ABANDONED"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    statusFilter === status
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {status === "ALL"
                    ? "All"
                    : status === "COMPLETED"
                    ? "Completed"
                    : status === "IN_PROGRESS"
                    ? "In Progress"
                    : "Abandoned"}
                </button>
              ))}
            </div>
          </div>

          {/* Loading state */}
          {isHistoryLoading && (
            <div className="py-16 text-center text-muted-foreground">
              <div className="w-8 h-8 mx-auto mb-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Loading your workout history...
            </div>
          )}

          {/* Error and retry state */}
          {isHistoryError && (
            <div className="py-12 text-center">
              <p className="text-red-400 mb-4">Failed to load workout sessions from server.</p>
              <button
                onClick={() => refetchHistory()}
                className="py-2 px-4 rounded-xl text-sm font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border inline-flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!isHistoryLoading && !isHistoryError && sessions.length === 0 && (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                <Calendar className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-foreground text-lg mb-1">No workout sessions found</h4>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {statusFilter !== "ALL"
                  ? `You don't have any sessions with status "${statusFilter}". Try another filter.`
                  : "You haven't logged any workouts yet. Open any workout from the catalog and click Start to track your session!"}
              </p>
            </div>
          )}

          {/* Sessions List */}
          {!isHistoryLoading && !isHistoryError && sessions.length > 0 && (
            <div className="space-y-3">
              {sessions.map((sess) => {
                const isCompleted = sess.status === "COMPLETED";
                const isInProgress = sess.status === "IN_PROGRESS";

                return (
                  <div
                    key={sess.id}
                    className="p-4 sm:p-5 rounded-2xl bg-secondary/20 hover:bg-secondary/40 border border-border/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isCompleted
                            ? "bg-emerald-500/10 text-emerald-400"
                            : isInProgress
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : isInProgress ? (
                          <Clock className="w-5 h-5" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-foreground text-base">
                            {sess.workoutTitle}
                          </h4>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isCompleted
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : isInProgress
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {sess.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{formatDate(sess.startedAt)}</span>
                          <span>·</span>
                          <span>
                            {sess.completedStepIndices?.length || 0} of {sess.totalSteps} steps completed
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 self-end sm:self-center text-sm font-medium">
                      <div className="text-right">
                        <span className="text-muted-foreground block text-xs">Duration</span>
                        <span className="text-foreground font-semibold">
                          {formatDuration(sess.durationSeconds)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground block text-xs">Calories</span>
                        <span className="text-foreground font-semibold">
                          {sess.workoutCalories} cal
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
                  <p className="text-xs text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground disabled:opacity-40 transition-colors"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={currentPage >= pagination.totalPages}
                      className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground disabled:opacity-40 transition-colors"
                      title="Next Page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Workout modal for resumed sessions */}
      <WorkoutModal
        workout={selectedWorkoutForModal}
        onClose={() => {
          setSelectedWorkoutForModal(null);
          refetchSummary();
          refetchHistory();
        }}
      />
    </div>
  );
}
