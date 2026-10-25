import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Flame, CheckCircle2, Play, Pause, RotateCcw } from "lucide-react";
import type { Workout } from "@/data/workouts";

interface WorkoutModalProps {
  workout: Workout | null;
  onClose: () => void;
}

export default function WorkoutModal({ workout, onClose }: WorkoutModalProps) {
  const getInitialTime = (durationStr?: string) => {
    if (!durationStr) return 60;
    const match = durationStr.match(/\d+/);
    return match ? parseInt(match[0], 10) * 60 : 60;
  };

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [timerLeft, setTimerLeft] = useState(60);
  const [maxTime, setMaxTime] = useState(60);
  const [timerActive, setTimerActive] = useState(false);

  // Sync state when a new workout is opened
  useEffect(() => {
    if (workout) {
      const timeInSecs = getInitialTime(workout.duration);
      setTimerLeft(timeInSecs);
      setMaxTime(timeInSecs);
      setTimerActive(false);
      setCompletedSteps(new Set());
    }
  }, [workout]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timerLeft > 0) {
      interval = setInterval(() => {
        setTimerLeft((t) => t - 1);
      }, 1000);
    } else if (timerLeft === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerLeft]);

  const toggleStep = (index: number) => {
    const newSet = new Set(completedSteps);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setCompletedSteps(newSet);
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

              <div className="flex flex-col lg:flex-row gap-8">
                {/* Steps Section */}
                <div className="lg:w-2/3">
                  <h3 className="font-display font-semibold text-xl text-foreground mb-4">Focus Mode Instructions</h3>
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
                            isCompleted ? "bg-primary/5 border-primary/20 opacity-60" : "bg-card border-border hover:border-primary/40 soft-shadow"
                          }`}
                        >
                          <CheckCircle2 className={`w-6 h-6 mt-0.5 shrink-0 transition-colors ${
                            isCompleted ? "text-primary" : "text-muted-foreground group-hover:text-primary/70"
                          }`} />
                          <span className={`text-base transition-all ${
                            isCompleted ? "text-muted-foreground line-through" : "text-foreground"
                          }`}>
                            {step}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Workout Timer Section */}
                <div className="lg:w-1/3">
                  <div className="sticky top-6 p-6 rounded-3xl bg-secondary/30 border border-border flex flex-col items-center shadow-lg">
                    <h3 className="font-display font-semibold text-lg text-foreground mb-1 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" /> Workout Timer
                    </h3>
                    <p className="text-sm text-muted-foreground mb-8 text-center" title={workout.duration}>Time allotted: <strong>{workout.duration}</strong></p>
                    
                    <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                      <svg className="w-full h-full transform -rotate-90 drop-shadow-xl ">
                        <circle cx="96" cy="96" r="88" fill="none" className="stroke-secondary" strokeWidth="8" />
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
                        <div className={`font-display font-bold text-5xl tabular-nums ${timerLeft === 0 ? "text-primary" : "text-foreground"}`}>
                          {formatTime(timerLeft)}
                        </div>
                        {timerLeft === 0 && <span className="text-xs text-primary font-bold mt-1 uppercase tracking-widest neon-text">Done!</span>}
                      </div>
                    </div>

                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => {
                          if (timerLeft === 0) setTimerLeft(maxTime);
                          setTimerActive(!timerActive);
                        }}
                        className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                          timerActive 
                            ? "bg-secondary text-foreground hover:bg-secondary/80 border border-border" 
                            : "gradient-primary text-primary-foreground neon-glow hover:opacity-90"
                        }`}
                      >
                        {timerActive ? <><Pause className="w-5 h-5" /> Pause</> : <><Play className="w-5 h-5" /> {timerLeft === 0 ? "Restart" : "Start"}</>}
                      </button>
                      <button
                        onClick={() => { setTimerActive(false); setTimerLeft(maxTime); }}
                        className="p-4 rounded-2xl bg-secondary border border-border text-foreground hover:bg-secondary/80 transition-colors shadow-md active:scale-95"
                        title="Reset Timer"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
