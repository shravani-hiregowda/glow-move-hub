import { motion } from "framer-motion";
import { Play, Zap, Trophy, Users } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

interface HeroSectionProps {
  onStartWorkout: () => void;
  workoutCount: number;
}

const stats = [
  { icon: Zap, value: "100+", label: "Workouts" },
  { icon: Trophy, value: "All", label: "Levels" },
  { icon: Users, value: "24/7", label: "Access" },
];

export default function HeroSection({ onStartWorkout, workoutCount }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="Gym background" className="w-full h-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
              <Zap className="w-4 h-4" /> {workoutCount}+ Workouts Available
            </span>
          </motion.div>

          <motion.h1
            className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            Transform Your{" "}
            <span className="text-primary neon-text">Body</span>
            <br />
            Transform Your{" "}
            <span className="text-cyan">Life</span>
          </motion.h1>

          <motion.p
            className="text-lg text-muted-foreground mb-8 max-w-lg"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Premium workout tutorials designed for every fitness level. Start your journey to a stronger, healthier you.
          </motion.p>

          <motion.div
            className="flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <motion.button
              onClick={onStartWorkout}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl gradient-primary text-primary-foreground font-display font-semibold text-lg neon-glow transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play className="w-5 h-5" /> Start Workout
            </motion.button>
            <motion.button
              onClick={onStartWorkout}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-border bg-secondary text-foreground font-display font-semibold text-lg hover:bg-primary/10 hover:border-primary/30 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Browse All
            </motion.button>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="flex gap-6 mt-12 flex-wrap"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            {stats.map((stat, i) => (
              <div key={i} className="flex items-center gap-3 pr-6 border-r border-border last:border-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-display font-bold text-xl text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
