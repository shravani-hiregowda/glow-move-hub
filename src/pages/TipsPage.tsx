import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { fitnessTips } from "@/data/workouts";
import { useTheme } from "@/hooks/useTheme";
import Navbar from "@/components/Navbar";

export default function TipsPage() {
  const { isDark, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <Navbar isDark={isDark} onToggleTheme={toggle} activeSection="tips" onNavigate={() => {}} />

      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6"
        >
          <div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground flex items-center gap-3">
              <Lightbulb className="w-10 h-10 text-primary" /> Fitness <span className="text-primary">Tips</span>
            </h1>
            <p className="text-muted-foreground mt-3 text-lg max-w-xl">
              Elevate your training, nutrition, and recovery with our comprehensive guide to pushing your limits safely and effectively.
            </p>
          </div>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {fitnessTips.map((tip, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="p-6 rounded-3xl glass shadow-sm border border-border hover:border-primary/50 hover:shadow-primary/10 transition-all flex flex-col h-full"
            >
              <div className="text-5xl mb-4 bg-secondary/50 w-16 h-16 flex items-center justify-center rounded-2xl">
                {tip.icon}
              </div>
              <h3 className="font-display font-bold text-lg text-foreground mb-3">
                {tip.title}
              </h3>
              <p className="text-muted-foreground text-sm flex-1 leading-relaxed">
                {tip.tip}
              </p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
