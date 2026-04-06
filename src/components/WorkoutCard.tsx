import { motion } from "framer-motion";
import { Clock, Flame } from "lucide-react";
import type { Workout } from "@/data/workouts";

const difficultyColor: Record<string, string> = {
  Beginner: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Intermediate: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Advanced: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

interface WorkoutCardProps {
  workout: Workout;
  index: number;
  onClick: () => void;
}

export default function WorkoutCard({ workout, index, onClick }: WorkoutCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      onClick={onClick}
      className="group cursor-pointer rounded-2xl overflow-hidden bg-card soft-shadow border border-border hover:border-primary/30 transition-all duration-300"
      whileHover={{ y: -6 }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={workout.image}
          alt={workout.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          width={640}
          height={480}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-80" />
        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-300" />

        {/* Badge */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${difficultyColor[workout.difficulty]}`}>
            {workout.difficulty}
          </span>
        </div>

        {/* Body part tag */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-secondary/80 text-foreground backdrop-blur-sm border border-border">
            {workout.bodyPart}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-display font-semibold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
          {workout.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{workout.description}</p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-primary" /> {workout.duration}
          </span>
          <span className="flex items-center gap-1">
            <Flame className="w-4 h-4 text-cyan" /> {workout.calories} cal
          </span>
        </div>
      </div>
    </motion.div>
  );
}
