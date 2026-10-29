import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Droplets,
  Moon,
  Apple,
  Target,
  Flame,
  TrendingUp,
  Sparkles,
  Timer,
  Dumbbell,
  ShieldCheck,
  Footprints,
  CalendarCheck,
  Ruler,
  Headphones,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { fitnessTips } from "@/data/workouts";
import { useWorkoutContext, FitnessTip } from "@/contexts/WorkoutContext";

// Map tip titles or index to sleek brand-colored Lucide icons
export const tipIcons: Record<string, React.ElementType> = {
  "Stay Hydrated": Droplets,
  "Rest & Recovery": Moon,
  "Nutrition First": Apple,
  "Set Goals": Target,
  "Warm Up Properly": Flame,
  "Progressive Overload": TrendingUp,
  "Mind-Muscle Connection": Sparkles,
  "Time Under Tension": Timer,
  "Protein Intake": Dumbbell,
  "Electrolytes Matter": ShieldCheck,
  "Active Recovery": Footprints,
  "Consistency": CalendarCheck,
  "Form Over Weight": Ruler,
  "Music Motivation": Headphones,
  "Post-Workout Fuel": Zap,
};

export default function TipsSection() {
  let tips: FitnessTip[] = fitnessTips;
  try {
    const ctx = useWorkoutContext();
    if (ctx?.tips && ctx.tips.length > 0) {
      tips = ctx.tips;
    }
  } catch {
    tips = fitnessTips;
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-border/60" id="tips">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <span className="text-xs font-semibold tracking-wider uppercase text-primary mb-2.5 inline-block">
          Performance Guidance
        </span>
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground mb-3">
          Fitness <span className="text-primary font-black">Tips</span>
        </h2>
        <p className="font-body text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
          Evidence-based strategies to accelerate recovery, optimize nutritional intake, and maintain training discipline.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tips.slice(0, 3).map((tip, i) => {
          const IconComponent = tipIcons[tip.title] || CheckCircle2;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="p-6 rounded-2xl bg-card border border-border/80 hover:border-primary/40 soft-shadow card-elevated flex flex-col justify-between group cursor-default transition-all"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 border border-primary/20 shadow-xs group-hover:scale-110 transition-transform">
                  <IconComponent className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-bold text-lg tracking-tight text-foreground mb-2 group-hover:text-primary transition-colors">
                  {tip.title}
                </h3>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">
                  {tip.tip}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-border/40 flex items-center text-xs font-medium text-primary">
                <span>Core Protocol #{i + 1}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        className="mt-12 text-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <Link
          to="/tips"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border/80 bg-card hover:bg-secondary text-foreground text-sm font-semibold tracking-wide transition-all shadow-xs group hover:border-primary/40"
        >
          View All Recommendations <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
        </Link>
      </motion.div>
    </section>
  );
}
