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
        className="flex items-end justify-between mb-8 pb-4 border-b border-border/60"
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-primary mb-1 block">
            Editor's Spotlight
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Featured <span className="text-primary font-black">Workouts</span>
          </h2>
        </div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          Swipe to view <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </motion.div>

      <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
        {featured.map((w, i) => (
          <motion.div
            key={w.id}
            initial={{ opacity: 0, x: 25 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            onClick={() => onSelect(w)}
            className="min-w-[280px] sm:min-w-[340px] snap-start rounded-xl overflow-hidden relative group cursor-pointer border border-border/70 hover:border-primary/40 soft-shadow card-elevated"
            whileHover={{ scale: 1.01 }}
          >
            <div className="aspect-[16/10] relative bg-secondary">
              <img
                src={w.image}
                alt={w.title}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                loading="lazy"
                width={640}
                height={400}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== `${window.location.origin}/placeholder.svg`) {
                    target.src = "/placeholder.svg";
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <span className="inline-block text-[11px] font-semibold tracking-wider uppercase text-primary mb-1">
                  {w.difficulty} · {w.bodyPart}
                </span>
                <h3 className="font-display font-bold text-lg tracking-tight text-foreground line-clamp-1">
                  {w.title}
                </h3>
                <p className="font-body text-xs text-muted-foreground font-medium mt-0.5">
                  {w.duration} · {w.calories} kcal
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
