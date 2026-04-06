import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { Workout } from "@/data/workouts";

interface FeaturedCarouselProps {
  workouts: Workout[];
  onSelect: (w: Workout) => void;
}

export default function FeaturedCarousel({ workouts, onSelect }: FeaturedCarouselProps) {
  const featured = workouts.slice(0, 5);

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <motion.div
        className="flex items-center justify-between mb-8"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          Featured <span className="text-primary">Workouts</span>
        </h2>
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          Scroll <ChevronRight className="w-4 h-4" />
        </span>
      </motion.div>

      <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
        {featured.map((w, i) => (
          <motion.div
            key={w.id}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onSelect(w)}
            className="min-w-[300px] sm:min-w-[340px] snap-start rounded-2xl overflow-hidden relative group cursor-pointer"
            whileHover={{ scale: 1.02 }}
          >
            <div className="aspect-[16/10] relative">
              <img src={w.image} alt={w.title} className="w-full h-full object-cover" loading="lazy" width={640} height={400} />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors" />
              <div className="absolute bottom-4 left-4 right-4">
                <span className="text-xs text-primary font-semibold">{w.difficulty}</span>
                <h3 className="font-display font-bold text-lg text-foreground">{w.title}</h3>
                <p className="text-sm text-muted-foreground">{w.duration} · {w.calories} cal</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
