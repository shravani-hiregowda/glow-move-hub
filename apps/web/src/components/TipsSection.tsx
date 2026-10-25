import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { fitnessTips } from "@/data/workouts";

export default function TipsSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
          Fitness <span className="text-primary">Tips</span>
        </h2>
        <p className="text-muted-foreground">Quick tips to maximize your results</p>
      </motion.div>

      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 justify-center">
        {fitnessTips.slice(0, 3).map((tip, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="min-w-[260px] snap-start p-6 rounded-2xl glass border border-border hover:border-primary/30 transition-all group"
            whileHover={{ y: -4 }}
          >
            <div className="text-4xl mb-4">{tip.icon}</div>
            <h3 className="font-display font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
              {tip.title}
            </h3>
            <p className="text-sm text-muted-foreground">{tip.tip}</p>
          </motion.div>
        ))}
      </div>

      <motion.div 
        className="mt-12 text-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <Link 
          to="/tips" 
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-primary/30 text-primary font-display font-semibold hover:bg-primary/10 transition-all group"
        >
          View All Tips <span className="group-hover:translate-x-1 transition-transform">→</span>
        </Link>
      </motion.div>
    </section>
  );
}
