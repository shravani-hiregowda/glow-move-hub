import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Eye, ImageIcon } from "lucide-react";
import type { Workout, Difficulty, BodyPart } from "@/data/workouts";

interface AdminPanelProps {
  onAddWorkout: (workout: Workout) => void;
}

const emptyForm = {
  title: "",
  difficulty: "Beginner" as Difficulty,
  bodyPart: "Chest" as BodyPart,
  duration: "",
  calories: 0,
  videoUrl: "",
  description: "",
  steps: [""],
  image: "",
};

export default function AdminPanel({ onAddWorkout }: AdminPanelProps) {
  const [form, setForm] = useState(emptyForm);
  const [showPreview, setShowPreview] = useState(false);

  const updateField = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const updateStep = (i: number, val: string) => {
    const newSteps = [...form.steps];
    newSteps[i] = val;
    setForm((f) => ({ ...f, steps: newSteps }));
  };

  const addStep = () => setForm((f) => ({ ...f, steps: [...f.steps, ""] }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.duration) return;
    onAddWorkout({
      ...form,
      id: Date.now().toString(),
      calories: Number(form.calories),
      image: form.image || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=640",
      steps: form.steps.filter(Boolean),
    });
    setForm(emptyForm);
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
          Admin <span className="text-primary">Panel</span>
        </h2>
        <p className="text-muted-foreground">Add new workouts to the library</p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          className="p-6 sm:p-8 rounded-3xl glass border border-border space-y-5"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <FloatingInput label="Workout Title" value={form.title} onChange={(v) => updateField("title", v)} />
          <FloatingInput label="Description" value={form.description} onChange={(v) => updateField("description", v)} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={(e) => updateField("difficulty", e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Body Part</label>
              <select
                value={form.bodyPart}
                onChange={(e) => updateField("bodyPart", e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {["Chest", "Back", "Legs", "Arms", "Core", "Full Body", "Shoulders"].map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FloatingInput label="Duration (e.g. 15 min)" value={form.duration} onChange={(v) => updateField("duration", v)} />
            <FloatingInput label="Calories" value={String(form.calories)} onChange={(v) => updateField("calories", v)} type="number" />
          </div>

          <FloatingInput label="YouTube Embed URL" value={form.videoUrl} onChange={(v) => updateField("videoUrl", v)} />
          <FloatingInput label="Image URL (optional)" value={form.image} onChange={(v) => updateField("image", v)} />

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Steps</label>
            {form.steps.map((step, i) => (
              <input
                key={i}
                value={step}
                onChange={(e) => updateStep(i, e.target.value)}
                placeholder={`Step ${i + 1}`}
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 mb-2"
              />
            ))}
            <button type="button" onClick={addStep} className="text-sm text-primary hover:underline flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add step
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <motion.button
              type="submit"
              className="flex-1 py-3 rounded-2xl gradient-primary text-primary-foreground font-display font-semibold neon-glow"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Add Workout
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-3 rounded-2xl border border-border bg-secondary text-foreground"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Eye className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.form>

        {/* Live Preview */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="hidden lg:block"
        >
          <div className="sticky top-24">
            <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" /> Live Preview
            </h3>
            <div className="rounded-2xl overflow-hidden bg-card soft-shadow border border-border">
              <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                {form.image ? (
                  <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-12 h-12 text-muted-foreground" />
                )}
              </div>
              <div className="p-4">
                <div className="flex gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                    {form.difficulty}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent/10 text-accent border border-accent/20">
                    {form.bodyPart}
                  </span>
                </div>
                <h4 className="font-display font-semibold text-foreground text-lg">{form.title || "Workout Title"}</h4>
                <p className="text-sm text-muted-foreground mt-1">{form.description || "Description..."}</p>
                <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                  <span>{form.duration || "-- min"}</span>
                  <span>{form.calories || 0} cal</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FloatingInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=" "
        className="peer w-full px-4 pt-6 pb-2 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
      />
      <label className="absolute left-4 top-2 text-xs text-muted-foreground peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs transition-all pointer-events-none">
        {label}
      </label>
    </div>
  );
}
