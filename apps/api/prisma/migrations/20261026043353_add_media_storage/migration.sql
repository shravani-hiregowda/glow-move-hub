-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "workout_id" TEXT,
    "provider" VARCHAR(50) NOT NULL DEFAULT 'local',
    "object_key" VARCHAR(500) NOT NULL,
    "url" VARCHAR(1000) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "original_name" VARCHAR(255),
    "legacy_source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_object_key_key" ON "media"("object_key");

-- CreateIndex
CREATE INDEX "media_workout_id_idx" ON "media"("workout_id");

-- CreateIndex
CREATE INDEX "media_checksum_idx" ON "media"("checksum");

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
