import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale,
  Plus,
  TrendingDown,
  TrendingUp,
  Target,
  Trash2,
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { WeightLogDto } from "@jerai/shared";

interface WeightTrackerProps {
  isDark?: boolean;
}

export default function WeightTracker({ isDark = true }: WeightTrackerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [weightInput, setWeightInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [showLogForm, setShowLogForm] = useState(false);

  // Fetch weight logs from live backend
  const {
    data: logs = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["weight-logs"],
    queryFn: () => api.getWeightLogs(),
    staleTime: 1000 * 30,
  });

  // Create weight log mutation
  const createMutation = useMutation({
    mutationFn: (newEntry: { weight: number; note?: string }) =>
      api.createWeightLog(newEntry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weight-logs"] });
      toast.success("Weight entry recorded!");
      setWeightInput("");
      setNoteInput("");
      setShowLogForm(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to record weight entry.");
    },
  });

  // Delete weight log mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteWeightLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weight-logs"] });
      toast.success("Weight log entry deleted.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete entry.");
    },
  });

  const handleCreateLog = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(weightInput);
    if (!val || val < 20 || val > 500) {
      toast.error("Please enter a valid weight between 20 kg and 500 kg.");
      return;
    }

    createMutation.mutate({
      weight: val,
      note: noteInput.trim() || undefined,
    });
  };

  // Calculate statistics
  const currentWeight = logs.length > 0 ? logs[logs.length - 1].weight : null;
  const initialWeight = logs.length > 0 ? logs[0].weight : null;
  const targetWeight = user?.targetWeight || (currentWeight ? Math.round((currentWeight - 3) * 10) / 10 : null);
  const totalChange =
    currentWeight && initialWeight
      ? Math.round((currentWeight - initialWeight) * 10) / 10
      : 0;

  // Format chart data
  const chartData = logs.map((log: WeightLogDto) => {
    const d = new Date(log.loggedAt);
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      fullDate: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
      weight: log.weight,
      note: log.note,
    };
  });

  // Determine min and max Y domain
  const weights = logs.map((l: WeightLogDto) => l.weight);
  if (targetWeight) weights.push(targetWeight);
  const minY = weights.length ? Math.floor(Math.min(...weights) - 2) : 60;
  const maxY = weights.length ? Math.ceil(Math.max(...weights) + 2) : 90;

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border soft-shadow space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider mb-1">
            <Scale className="w-4 h-4" /> Live Weight Tracking & Trends
          </div>
          <h3 className="font-display text-2xl font-bold text-foreground">
            Weight Journey
          </h3>
          <p className="text-sm text-muted-foreground">
            Log your regular weigh-ins and track progress towards your target.
          </p>
        </div>

        <button
          onClick={() => setShowLogForm(!showLogForm)}
          className="self-start sm:self-center py-2 px-4 rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Log Weight
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border">
          <span className="text-xs text-muted-foreground font-medium block">Current Weight</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-display font-bold text-foreground">
              {currentWeight ? currentWeight.toFixed(1) : "—"}
            </span>
            <span className="text-xs text-muted-foreground">kg</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-secondary/30 border border-border">
          <span className="text-xs text-muted-foreground font-medium block">Starting Weight</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-display font-bold text-foreground">
              {initialWeight ? initialWeight.toFixed(1) : "—"}
            </span>
            <span className="text-xs text-muted-foreground">kg</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-secondary/30 border border-border">
          <span className="text-xs text-muted-foreground font-medium block">Net Change</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span
              className={`text-2xl font-display font-bold flex items-center gap-1 ${
                totalChange < 0
                  ? "text-emerald-500"
                  : totalChange > 0
                  ? "text-amber-500"
                  : "text-foreground"
              }`}
            >
              {totalChange < 0 ? (
                <TrendingDown className="w-5 h-5" />
              ) : totalChange > 0 ? (
                <TrendingUp className="w-5 h-5" />
              ) : null}
              {totalChange > 0 ? `+${totalChange}` : totalChange}
            </span>
            <span className="text-xs text-muted-foreground">kg</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-secondary/30 border border-border">
          <span className="text-xs text-muted-foreground font-medium block">Target Goal</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-display font-bold text-primary flex items-center gap-1">
              <Target className="w-4 h-4" />
              {targetWeight ? targetWeight.toFixed(1) : "—"}
            </span>
            <span className="text-xs text-muted-foreground">kg</span>
          </div>
        </div>
      </div>

      {/* Log Form (Collapsible) */}
      <AnimatePresence>
        {showLogForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreateLog}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-2xl bg-secondary/50 border border-border space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Record New Weight Entry
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Weight (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="500"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    placeholder="e.g. 72.8"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Note (optional)
                  </label>
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="e.g. Post-workout morning weigh-in"
                    maxLength={100}
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogForm(false)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="py-1.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Log Entry"
                  )}
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Chart Section */}
      <div className="pt-2">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
            Loading weight progression...
          </div>
        ) : isError ? (
          <div className="h-64 flex flex-col items-center justify-center text-red-400 text-sm">
            <AlertCircle className="w-6 h-6 mb-2" />
            Failed to load weight tracking data.
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <Scale className="w-10 h-10 mb-2 opacity-50" />
            <p className="font-semibold text-foreground">No weight entries logged yet</p>
            <p className="text-xs max-w-sm mt-1">
              Click &quot;Log Weight&quot; above to log your current weight and see your progress curve over time!
            </p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke={isDark ? "#888888" : "#666666"}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[minY, maxY]}
                  stroke={isDark ? "#888888" : "#666666"}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}kg`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-3 rounded-xl bg-card border border-border shadow-xl text-xs space-y-1">
                          <p className="font-bold text-foreground">{data.fullDate}</p>
                          <p className="text-primary font-semibold text-sm">
                            {data.weight.toFixed(1)} kg
                          </p>
                          {data.note && (
                            <p className="text-muted-foreground italic">&ldquo;{data.note}&rdquo;</p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {targetWeight && (
                  <ReferenceLine
                    y={targetWeight}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{
                      value: `Target: ${targetWeight}kg`,
                      fill: "#10b981",
                      fontSize: 10,
                      position: "right",
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#weightGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent Log Entries */}
      {logs.length > 0 && (
        <div className="pt-4 border-t border-border">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Recent Log Entries
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
            {[...logs].reverse().slice(0, 6).map((log: WeightLogDto) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-secondary/30 border border-border flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-sm">
                      {log.weight.toFixed(1)} kg
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(log.loggedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  {log.note && (
                    <p className="text-muted-foreground truncate max-w-[160px] text-[11px] mt-0.5">
                      {log.note}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => deleteMutation.mutate(log.id)}
                  disabled={deleteMutation.isPending}
                  title="Delete Entry"
                  aria-label="Delete Entry"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
