import { motion } from "framer-motion";
import { Play, Zap, Trophy, Users } from "lucide-react";
import heroBg from "@/assets/hero-bg-new.png";

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
    <section className="relative min-h-[92vh] flex items-center overflow-hidden border-b border-border/60">
      {/* Background - Authentic natural gym facility with warm lighting */}
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="Athletic Gym Background"
          className="w-full h-full object-cover object-center filter brightness-[0.9] dark:brightness-[0.45] transition-all"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 w-full">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-6 border border-primary/20">
              <Zap className="w-3.5 h-3.5" /> {workoutCount}+ Professional Programs
            </span>
          </motion.div>

          <motion.h1
            className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.06] mb-6 text-foreground"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Transform Your{" "}
            <span className="text-primary font-black">Body</span>
            <br />
            Elevate Your Strength
          </motion.h1>

          <motion.p
            className="text-base sm:text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed font-body"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Scientifically structured exercise regimens crafted for high performance, strength conditioning, and progressive fitness milestones.
          </motion.p>

          <motion.div
            className="flex flex-wrap items-center gap-4"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <motion.button
              onClick={onStartWorkout}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold text-base shadow-sm hover:shadow-md transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Play className="w-4 h-4 fill-current" /> Start Workout
            </motion.button>
            <motion.button
              onClick={onStartWorkout}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-border bg-card/80 hover:bg-secondary text-foreground font-display font-semibold text-base transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Browse Library
            </motion.button>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            className="flex gap-8 mt-12 pt-8 border-t border-border/80 flex-wrap"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {stats.map((stat, i) => (
              <div key={i} className="flex items-center gap-3 pr-6 border-r border-border/60 last:border-0 last:pr-0">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display font-bold text-xl tracking-tight text-foreground">{stat.value}</div>
                  <div className="text-xs font-medium text-muted-foreground tracking-wide uppercase">{stat.label}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
