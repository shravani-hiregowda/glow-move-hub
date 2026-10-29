import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Lightbulb, CheckCircle2 } from "lucide-react";
import { fitnessTips } from "@/data/workouts";
import { useWorkoutContext } from "@/contexts/WorkoutContext";
import { useTheme } from "@/hooks/useTheme";
import Navbar from "@/components/Navbar";
import { tipIcons } from "@/components/TipsSection";

export default function TipsPage() {
  const { isDark, toggle } = useTheme();
  let tips = fitnessTips;
  try {
    const ctx = useWorkoutContext();
    if (ctx?.tips && ctx.tips.length > 0) {
      tips = ctx.tips;
    }
  } catch {
    tips = fitnessTips;
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <Navbar isDark={isDark} onToggleTheme={toggle} activeSection="tips" onNavigate={() => {}} />

      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-8"
        >
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-primary mb-1.5 block">
              Performance Protocols
            </span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <Lightbulb className="w-8 h-8 text-primary" /> Fitness <span className="text-primary font-black">Tips</span>
            </h1>
            <p className="font-body text-muted-foreground mt-2.5 text-base sm:text-lg max-w-xl leading-relaxed">
              Evidence-based guidelines for hypertrophy progression, nutritional timing, electrolyte balance, and neuromuscular recovery.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/80 bg-card hover:bg-secondary text-foreground text-sm font-semibold tracking-wide transition-all shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Catalog
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tips.map((tip, i) => {
            const IconComponent = tipIcons[tip.title] || CheckCircle2;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
                className="p-6 rounded-2xl bg-card border border-border/80 hover:border-primary/40 soft-shadow card-elevated flex flex-col justify-between group transition-all"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 border border-primary/20 shadow-xs group-hover:scale-110 transition-transform">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display font-bold text-lg tracking-tight text-foreground mb-2 group-hover:text-primary transition-colors">
                    {tip.title}
                  </h3>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed">
                    {tip.tip}
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-border/40 text-[11px] font-semibold tracking-wider uppercase text-primary/80">
                  Protocol #{i + 1}
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
