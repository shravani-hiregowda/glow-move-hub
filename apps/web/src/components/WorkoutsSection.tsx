import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  Clock,
  Sparkles,
  ChevronDown,
  X,
  BookmarkCheck,
} from "lucide-react";
import WorkoutCard from "./WorkoutCard";
import type { Workout, Difficulty, BodyPart } from "@/data/workouts";
import { BODY_PARTS } from "@/data/workouts";
import { toast } from "sonner";

const difficulties: Difficulty[] = ["Beginner", "Intermediate", "Advanced"];

const durationRanges = [
  { id: "all", label: "Any Duration" },
  { id: "short", label: "Under 20m", max: 19 },
  { id: "medium", label: "20 - 30m", min: 20, max: 30 },
  { id: "long", label: "30m+", min: 31 },
];

const categoryPills: Array<{ id: string; label: string; filterValue: BodyPart | "" }> = [
  { id: "all", label: "All Workouts", filterValue: "" },
  { id: "chest", label: "Chest", filterValue: "Chest" },
  { id: "back", label: "Back", filterValue: "Back" },
  { id: "legs", label: "Legs", filterValue: "Legs" },
  { id: "arms", label: "Arms", filterValue: "Arms" },
  { id: "core", label: "Core", filterValue: "Core" },
  { id: "fullbody", label: "Full Body", filterValue: "Full Body" },
  { id: "shoulders", label: "Shoulders", filterValue: "Shoulders" },
  { id: "cardio", label: "Cardio", filterValue: "Cardio" },
  { id: "fatloss", label: "Fat Loss", filterValue: "Fat Loss" },
];

const INITIAL_PAGE_SIZE = 9;

interface WorkoutsSectionProps {
  workouts: Workout[];
  onSelect: (w: Workout) => void;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}

export default function WorkoutsSection({
  workouts,
  onSelect,
  isLoading,
  isError,
  errorMessage,
  onRetry,
}: WorkoutsSectionProps) {
  const [search, setSearch] = useState("");
  const [diffFilter, setDiffFilter] = useState<Difficulty | "">("");
  const [bodyFilter, setBodyFilter] = useState<BodyPart | "">("");
  const [durationFilter, setDurationFilter] = useState("all");
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [displayCount, setDisplayCount] = useState(INITIAL_PAGE_SIZE);

  // Bookmark / saved state stored in localStorage
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined" || !window.localStorage) return new Set();
    try {
      const saved = localStorage.getItem("jerai_bookmarked_workouts");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const handleToggleBookmark = (e: React.MouseEvent, workoutId: string) => {
    e.stopPropagation();
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(workoutId)) {
        next.delete(workoutId);
        toast("Removed from saved routines");
      } else {
        next.add(workoutId);
        toast.success("Saved to your workout routine");
      }
      try {
        localStorage.setItem("jerai_bookmarked_workouts", JSON.stringify([...next]));
      } catch {
        // quota safety
      }
      return next;
    });
  };

  const handleResetFilters = () => {
    setSearch("");
    setDiffFilter("");
    setBodyFilter("");
    setDurationFilter("all");
    setOnlyBookmarked(false);
    setDisplayCount(INITIAL_PAGE_SIZE);
  };

  const activeFilterCount =
    (diffFilter ? 1 : 0) +
    (bodyFilter ? 1 : 0) +
    (durationFilter !== "all" ? 1 : 0) +
    (onlyBookmarked ? 1 : 0);

  // Filtered dataset
  const filtered = useMemo(() => {
    return workouts.filter((w) => {
      const matchSearch =
        !search ||
        w.title.toLowerCase().includes(search.toLowerCase()) ||
        w.description.toLowerCase().includes(search.toLowerCase()) ||
        w.bodyPart.toLowerCase().includes(search.toLowerCase());

      const matchDiff = !diffFilter || w.difficulty === diffFilter;
      const matchBody = !bodyFilter || w.bodyPart === bodyFilter;

      let matchDuration = true;
      if (durationFilter !== "all") {
        const minutes = parseInt(w.duration.match(/\d+/)?.[0] || "0", 10);
        if (durationFilter === "short") matchDuration = minutes < 20;
        else if (durationFilter === "medium") matchDuration = minutes >= 20 && minutes <= 30;
        else if (durationFilter === "long") matchDuration = minutes > 30;
      }

      const matchBookmark = !onlyBookmarked || bookmarkedIds.has(w.id);

      return matchSearch && matchDiff && matchBody && matchDuration && matchBookmark;
    });
  }, [workouts, search, diffFilter, bodyFilter, durationFilter, onlyBookmarked, bookmarkedIds]);

  // Reset pagination count on search/filter changes
  useEffect(() => {
    setDisplayCount(INITIAL_PAGE_SIZE);
  }, [search, diffFilter, bodyFilter, durationFilter, onlyBookmarked]);

  const visibleWorkouts = useMemo(() => {
    return filtered.slice(0, displayCount);
  }, [filtered, displayCount]);

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="workouts">
      {/* Header with modern condensed typography hierarchy */}
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <span className="text-xs font-semibold tracking-wider uppercase text-primary mb-2.5 inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Precision Training Protocols
        </span>
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground mb-3">
          Explore <span className="text-primary font-black">Workouts</span>
        </h2>
        <p className="font-body text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Structured movement protocols designed for progressive overload, technique precision, and muscle hypertrophy.
        </p>
      </motion.div>

      {/* Category Pill Bar */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center">
        {categoryPills.map((cat) => {
          const isActive = bodyFilter === cat.filterValue;
          return (
            <button
              key={cat.id}
              onClick={() => setBodyFilter(cat.filterValue)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide whitespace-nowrap transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm scale-105"
                  : "bg-secondary/70 text-muted-foreground hover:text-foreground border border-border/60 hover:bg-secondary"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Search & Filter Toolbar */}
      <motion.div
        className="mb-8 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search workouts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-3 rounded-xl bg-secondary/80 border border-border/80 text-foreground placeholder:text-muted-foreground text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Drawer Toggle Button with Active Count */}
          <motion.button
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Toggle workout filters"
            title="Filters"
            className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 text-sm font-medium ${
              showFilters || activeFilterCount > 0
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-secondary/80 border-border/80 text-foreground hover:bg-secondary"
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </motion.button>
        </div>

        {/* Dynamic Multi-Select Filter Drawer */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-6 rounded-2xl bg-card border border-border/80 soft-shadow space-y-5">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h4 className="font-display font-bold text-sm tracking-tight text-foreground flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                    Advanced Filters
                  </h4>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={handleResetFilters}
                      className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset All
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Difficulty */}
                  <div>
                    <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-2.5 block">
                      Difficulty Level
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Chip label="All Levels" active={diffFilter === ""} onClick={() => setDiffFilter("")} />
                      {difficulties.map((d) => (
                        <Chip key={d} label={d} active={diffFilter === d} onClick={() => setDiffFilter(d)} />
                      ))}
                    </div>
                  </div>

                  {/* Duration Range */}
                  <div>
                    <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-2.5 block">
                      Duration Target
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {durationRanges.map((r) => (
                        <Chip
                          key={r.id}
                          label={r.label}
                          active={durationFilter === r.id}
                          onClick={() => setDurationFilter(r.id)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Bookmarked / Saved Only */}
                  <div>
                    <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-2.5 block">
                      Saved Routines
                    </label>
                    <button
                      onClick={() => setOnlyBookmarked(!onlyBookmarked)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all flex items-center gap-2 ${
                        onlyBookmarked
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "bg-secondary/70 text-muted-foreground hover:text-foreground border border-border/60 hover:bg-secondary"
                      }`}
                    >
                      <BookmarkCheck className="w-3.5 h-3.5" />
                      Bookmarked Only ({bookmarkedIds.size})
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Error state */}
      {isError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl bg-destructive/10 border border-destructive/20 text-center max-w-lg mx-auto mb-8"
        >
          <p className="text-destructive font-medium mb-2">Failed to load workouts from server</p>
          <p className="text-sm text-muted-foreground mb-4">
            {errorMessage || "Database connection unavailable. Showing cached data if available."}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              Retry Connection
            </button>
          )}
        </motion.div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="h-96 rounded-2xl bg-secondary/60 animate-pulse border border-border/80"
            />
          ))}
        </div>
      ) : (
        /* Workouts Grid with smooth layout transitions */
        <div>
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {visibleWorkouts.map((w, i) => (
                <WorkoutCard
                  key={w.id}
                  workout={w}
                  index={i}
                  onClick={() => onSelect(w)}
                  isBookmarked={bookmarkedIds.has(w.id)}
                  onToggleBookmark={handleToggleBookmark}
                />
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Pagination / Load More Button */}
          {visibleWorkouts.length < filtered.length && (
            <motion.div
              className="mt-12 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <button
                onClick={() => setDisplayCount((prev) => prev + 9)}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl border border-border/80 bg-card hover:bg-secondary text-foreground text-sm font-semibold tracking-wide transition-all shadow-xs hover:border-primary/40 group"
              >
                <span>Load More Routines</span>
                <span className="text-xs text-muted-foreground font-normal">
                  ({visibleWorkouts.length} of {filtered.length})
                </span>
                <ChevronDown className="w-4 h-4 text-primary group-hover:translate-y-0.5 transition-transform" />
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* Real Empty State - Must preserve exact test text! */}
      {!isLoading && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 px-4 max-w-md mx-auto"
        >
          <div className="w-16 h-16 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <Search className="w-7 h-7" />
          </div>
          <p className="text-base font-semibold text-foreground mb-2">No workouts found. Try different filters!</p>
          <p className="text-xs text-muted-foreground mb-6">
            We couldn't find matching routines with your active filters. Try resetting to view all available protocols.
          </p>
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold tracking-wide hover:bg-primary/90 transition-all shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All Filters
          </button>
        </motion.div>
      )}
    </section>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all ${
        active
          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
          : "bg-secondary/70 text-muted-foreground hover:text-foreground border border-border/60 hover:bg-secondary"
      }`}
    >
      {label}
    </button>
  );
}
