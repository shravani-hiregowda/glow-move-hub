import { useMemo } from "react";
import { Flame, Trophy, CalendarCheck, Zap } from "lucide-react";
import type { WorkoutSessionDto } from "@jerai/shared";

interface StreakHeatmapProps {
  sessions: WorkoutSessionDto[];
}

export default function StreakHeatmap({ sessions }: StreakHeatmapProps) {
  // Aggregate sessions by date (YYYY-MM-DD)
  const activityMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const session of sessions) {
      if (session.status === "COMPLETED") {
        const d = new Date(session.startedAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`;
        map.set(key, (map.get(key) || 0) + 1);
      }
    }
    return map;
  }, [sessions]);

  // Calculate current streak and longest streak
  const { currentStreak, longestStreak, totalActiveDays } = useMemo(() => {
    const sortedDates = Array.from(activityMap.keys()).sort();
    if (sortedDates.length === 0) {
      return { currentStreak: 0, longestStreak: 0, totalActiveDays: 0 };
    }

    let maxStreak = 0;
    let tempStreak = 0;
    let prevDate: Date | null = null;

    for (const dateStr of sortedDates) {
      const currDate = new Date(dateStr);
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round(
          (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) {
          tempStreak += 1;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      prevDate = currDate;
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak;
      }
    }

    // Check if streak is active up to today or yesterday
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;

    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(yesterday.getDate()).padStart(2, "0")}`;

    let activeStreak = 0;
    if (activityMap.has(todayKey) || activityMap.has(yesterdayKey)) {
      let checkDate = activityMap.has(todayKey) ? today : yesterday;
      while (true) {
        const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(checkDate.getDate()).padStart(2, "0")}`;
        if (activityMap.has(key)) {
          activeStreak += 1;
          checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
        } else {
          break;
        }
      }
    }

    return {
      currentStreak: activeStreak,
      longestStreak: Math.max(maxStreak, activeStreak),
      totalActiveDays: activityMap.size,
    };
  }, [activityMap]);

  // Generate last 28 days matrix for the heatmap grid
  const daysGrid = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 27; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      const count = activityMap.get(key) || 0;
      days.push({
        date: d,
        key,
        count,
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      });
    }
    return days;
  }, [activityMap]);

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border soft-shadow space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider mb-1">
            <Flame className="w-4 h-4 text-orange-400" /> Habit & Streak Consistency
          </div>
          <h3 className="font-display text-2xl font-bold text-foreground">
            Activity Heatmap & Streaks
          </h3>
          <p className="text-sm text-muted-foreground">
            Consistency is key to results. Track your workout cadence and active streaks.
          </p>
        </div>
      </div>

      {/* Streak Metric Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs text-orange-400/80 font-bold uppercase tracking-wider">
              Current Streak
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-3xl font-display font-bold text-foreground">
                {currentStreak}
              </span>
              <span className="text-xs text-muted-foreground">
                {currentStreak === 1 ? "day" : "days"}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-amber-400/80 font-bold uppercase tracking-wider">
              Best Record
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-3xl font-display font-bold text-foreground">
                {longestStreak}
              </span>
              <span className="text-xs text-muted-foreground">
                {longestStreak === 1 ? "day" : "days"}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-primary/80 font-bold uppercase tracking-wider">
              Total Active Days
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-3xl font-display font-bold text-foreground">
                {totalActiveDays}
              </span>
              <span className="text-xs text-muted-foreground">sessions logged</span>
            </div>
          </div>
        </div>
      </div>

      {/* 28-Day Heatmap Grid */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" /> Last 4 Weeks Activity Matrix
          </h4>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>Less</span>
            <span className="w-3 h-3 rounded-md bg-secondary border border-border" />
            <span className="w-3 h-3 rounded-md bg-primary/40" />
            <span className="w-3 h-3 rounded-md bg-primary" />
            <span>More</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-secondary/30 border border-border overflow-x-auto">
          <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 min-w-[320px]">
            {daysGrid.map((day) => {
              const bgClass =
                day.count === 0
                  ? "bg-secondary/70 border-border text-muted-foreground"
                  : day.count === 1
                  ? "gradient-primary text-primary-foreground font-bold shadow-sm"
                  : "bg-emerald-400 text-slate-950 font-bold shadow-md";

              return (
                <div
                  key={day.key}
                  title={`${day.label}: ${day.count} workout${day.count === 1 ? "" : "s"}`}
                  className={`h-11 rounded-xl border flex flex-col items-center justify-center transition-transform hover:scale-105 cursor-pointer text-center ${bgClass}`}
                >
                  <span className="text-[10px] opacity-80 leading-none">{day.label.split(" ")[0]}</span>
                  <span className="text-xs leading-tight font-display font-bold">
                    {day.label.split(" ")[1]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
