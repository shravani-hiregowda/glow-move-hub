import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Clock, Flame, Bookmark, ArrowUpRight, Dumbbell } from "lucide-react";
import type { Workout } from "@/data/workouts";

const difficultyBadgeStyle: Record<string, string> = {
  Beginner: "bg-emerald-950/70 border-emerald-500/30 text-emerald-300",
  Intermediate: "bg-amber-950/70 border-amber-500/30 text-amber-300",
  Advanced: "bg-rose-950/70 border-rose-500/30 text-rose-300",
};

export interface WorkoutCardProps {
  workout: Workout;
  index: number;
  onClick: () => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (e: React.MouseEvent, workoutId: string) => void;
}

const WorkoutCard = forwardRef<HTMLDivElement, WorkoutCardProps>(function WorkoutCard(
  { workout, index, onClick, isBookmarked = false, onToggleBookmark },
  ref
) {
  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4) }}
      onClick={onClick}
      className="group cursor-pointer rounded-2xl overflow-hidden bg-card border border-border/80 hover:border-primary/50 soft-shadow card-elevated transition-all flex flex-col justify-between"
    >
      <div>
        {/* Image container with authentic photography and unified 4:3 aspect ratio */}
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
          <img
            src={workout.image}
            alt={workout.title}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
            width={640}
            height={480}
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== `${window.location.origin}/placeholder.svg`) {
                target.src = "/placeholder.svg";
              }
            }}
          />
          {/* Subtle gradient vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

          {/* Top Translucent Floating Pills */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            {/* Sleek translucent difficulty pill */}
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase border backdrop-blur-md shadow-sm ${
                difficultyBadgeStyle[workout.difficulty] || "bg-black/60 border-white/10 text-white"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
              {workout.difficulty}
            </span>

            {/* Bookmark button */}
            <button
              type="button"
              aria-label={isBookmarked ? "Remove from bookmarks" : "Bookmark workout"}
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark?.(e, workout.id);
              }}
              className="pointer-events-auto p-2 rounded-full backdrop-blur-md bg-black/50 border border-white/15 text-white/90 hover:text-white hover:bg-black/75 hover:scale-110 active:scale-95 transition-all shadow-sm"
            >
              <Bookmark
                className={`w-3.5 h-3.5 transition-colors ${
                  isBookmarked ? "fill-primary text-primary" : "text-white/90"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Card Content & Standardized Padding */}
        <div className="p-5">
          {/* Category & Equipment pill */}
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wider uppercase text-primary">
              <Dumbbell className="w-3 h-3" />
              {workout.bodyPart}
            </span>
          </div>

          <h3 className="font-display font-bold text-lg tracking-tight text-foreground mb-1.5 group-hover:text-primary transition-colors line-clamp-1">
            {workout.title}
          </h3>

          <p className="font-body text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">
            {workout.description}
          </p>
        </div>
      </div>

      {/* Bottom Metadata & Explicit CTA */}
      <div className="px-5 pb-5 pt-3 border-t border-border/50 flex items-center justify-between text-xs font-medium text-muted-foreground bg-secondary/10">
        <div className="flex items-center gap-3.5">
          <span className="flex items-center gap-1.5 text-foreground/85">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>{workout.duration}</span>
          </span>
          <span className="flex items-center gap-1.5 text-foreground/85">
            <Flame className="w-3.5 h-3.5 text-primary" />
            <span>{workout.calories} kcal</span>
          </span>
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
          View Routine
          <ArrowUpRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </motion.div>
  );
});

export default WorkoutCard;
