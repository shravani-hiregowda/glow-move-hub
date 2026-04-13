import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, Eye, ImageIcon, Edit2, Trash2, X, Crop as CropIcon } from "lucide-react";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { type Workout, type Difficulty, type BodyPart, BODY_PARTS } from "@/data/workouts";

interface WorkoutFormProps {
  initialData?: Workout;
  onSave: (workout: Workout) => void;
  onCancel: () => void;
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

export default function WorkoutForm({ initialData, onSave, onCancel }: WorkoutFormProps) {
  const [form, setForm] = useState(emptyForm);
  const [showPreview, setShowPreview] = useState(false);
  const [cropSource, setCropSource] = useState<string>("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (initialData) {
      setForm({ ...initialData, calories: Number(initialData.calories) });
    }
  }, [initialData]);

  const updateField = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const updateStep = (i: number, val: string) => {
    const newSteps = [...form.steps];
    newSteps[i] = val;
    setForm((f) => ({ ...f, steps: newSteps }));
  };

  const addStep = () => setForm((f) => ({ ...f, steps: [...f.steps, ""] }));
  const removeStep = (i: number) => setForm((f) => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropSource(reader.result as string);
        setCrop(undefined);
      };
      reader.readAsDataURL(file);
    }
  };

  const centerAspectCrop = (mediaWidth: number, mediaHeight: number, aspect: number) => {
    return centerCrop(
      makeAspectCrop({ unit: "%", width: 90 }, aspect, mediaWidth, mediaHeight),
      mediaWidth,
      mediaHeight
    );
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 4 / 3));
  };

  const handleConfirmCrop = () => {
    const image = imgRef.current;
    if (!image || !completedCrop) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelRatio = window.devicePixelRatio;

    canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio);

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = "high";

    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;

    ctx.translate(-cropX, -cropY);
    ctx.drawImage(
      image,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight
    );

    const base64Image = canvas.toDataURL("image/webp", 0.9);
    updateField("image", base64Image);
    setCropSource("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.duration) return;
    
    onSave({
      ...form,
      id: initialData ? initialData.id : Date.now().toString(),
      calories: Number(form.calories),
      image: form.image || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=640",
      steps: form.steps.filter(Boolean),
    });
  };

  const isEditing = !!initialData;

  return (
    <div className="grid lg:grid-cols-2 gap-8 mt-6">
      <motion.form
        onSubmit={handleSubmit}
        className="p-6 sm:p-8 rounded-3xl glass border border-border space-y-5"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold font-display text-foreground">
            {isEditing ? "Edit Workout" : "Create New Workout"}
          </h3>
          <button type="button" onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        </div>

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
              {BODY_PARTS.map((b) => (
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
        
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-3 block">Workout Image</label>
          
          {!form.image ? (
            <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-border rounded-xl cursor-pointer bg-secondary/30 hover:bg-secondary/80 hover:border-primary/50 transition-all group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                <ImageIcon className="w-8 h-8 mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold text-primary">Click to upload</span> an image</p>
                <p className="text-xs text-muted-foreground/70 mt-1">PNG, JPG or WEBP (Max 5MB)</p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          ) : (
            <div className="relative group rounded-xl overflow-hidden border border-border aspect-video w-full max-w-sm bg-muted/20">
              <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-background/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold cursor-pointer hover:bg-primary/90 transition-all shadow-lg hover:scale-105 active:scale-95">
                  <Edit2 className="w-4 h-4" /> Edit Image
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
                <button 
                  type="button" 
                  onClick={() => updateField("image", "")}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold hover:bg-destructive/90 transition-all shadow-lg hover:scale-105 active:scale-95"
                >
                  <Trash2 className="w-4 h-4" /> Remove
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Steps</label>
          {form.steps.map((step, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                value={step}
                onChange={(e) => updateStep(i, e.target.value)}
                placeholder={`Step ${i + 1}`}
                className="flex-1 px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={() => removeStep(i)}
                className="px-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20"
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" onClick={addStep} className="text-sm text-primary hover:underline flex items-center gap-1 mt-2">
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
            {isEditing ? "Save Changes" : "Add Workout"}
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
        animate={{ opacity: 1, x: 0 }}
        className="hidden lg:block relative"
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

      {cropSource && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-card border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/50">
              <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                <CropIcon className="w-5 h-5 text-primary" /> Crop Image
              </h3>
              <button 
                type="button" 
                onClick={() => setCropSource("")} 
                className="p-2 bg-secondary rounded-full hover:bg-secondary/80 text-muted-foreground transition-colors"
                title="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 flex justify-center items-center bg-background/50">
              <div className="relative border border-border max-w-full max-h-full rounded-lg shadow-sm">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={4 / 3}
                  className="max-h-[60vh] max-w-full"
                >
                  <img
                    ref={imgRef}
                    alt="Upload preview"
                    src={cropSource}
                    onLoad={onImageLoad}
                    className="max-h-[60vh] object-contain block mx-auto pointer-events-none"
                    style={{ maxWidth: "100%" }}
                  />
                </ReactCrop>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-secondary/30 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setCropSource("")}
                className="px-6 py-2.5 rounded-xl border border-border bg-secondary text-foreground font-semibold hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleConfirmCrop}
                disabled={!completedCrop?.width || !completedCrop?.height}
                className="px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Crop
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
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
