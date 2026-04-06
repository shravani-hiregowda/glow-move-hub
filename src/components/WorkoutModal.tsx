import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Flame, CheckCircle2 } from "lucide-react";
import type { Workout } from "@/data/workouts";

interface WorkoutModalProps {
  workout: Workout | null;
  onClose: () => void;
}

export default function WorkoutModal({ workout, onClose }: WorkoutModalProps) {
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
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
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
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-xl glass flex items-center justify-center text-foreground hover:text-primary transition-colors"
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
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">{workout.title}</h2>
              <p className="text-muted-foreground mb-6">{workout.description}</p>

              <div className="flex gap-6 mb-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-5 h-5 text-primary" /> {workout.duration}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Flame className="w-5 h-5 text-cyan" /> {workout.calories} cal
                </div>
              </div>

              <h3 className="font-display font-semibold text-lg text-foreground mb-4">Step-by-Step Instructions</h3>
              <div className="space-y-3">
                {workout.steps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 border border-border"
                  >
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm text-foreground">{step}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
