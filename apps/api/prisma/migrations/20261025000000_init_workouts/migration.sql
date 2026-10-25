-- CreateTable
CREATE TABLE "workouts" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" VARCHAR(50) NOT NULL,
    "body_part" VARCHAR(50) NOT NULL,
    "duration" VARCHAR(50) NOT NULL,
    "calories" INTEGER NOT NULL,
    "video_url" VARCHAR(500) NOT NULL,
    "image" VARCHAR(2000) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_steps" (
    "id" TEXT NOT NULL,
    "workout_id" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "instruction" TEXT NOT NULL,

    CONSTRAINT "workout_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workouts_body_part_idx" ON "workouts"("body_part");

-- CreateIndex
CREATE INDEX "workouts_difficulty_idx" ON "workouts"("difficulty");

-- CreateIndex
CREATE INDEX "workout_steps_workout_id_idx" ON "workout_steps"("workout_id");

-- CreateIndex
CREATE UNIQUE INDEX "workout_steps_workout_id_step_order_key" ON "workout_steps"("workout_id", "step_order");

-- AddForeignKey
ALTER TABLE "workout_steps" ADD CONSTRAINT "workout_steps_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
