CREATE TABLE IF NOT EXISTS "os_photo_sessions" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "original_url" TEXT NOT NULL,
    "enhanced_url" TEXT,
    "mime_type" TEXT NOT NULL DEFAULT 'image/jpeg',
    "width" INTEGER,
    "height" INTEGER,
    "file_name" TEXT,
    "platform_target" TEXT NOT NULL DEFAULT 'instagram',
    "analysis" JSONB NOT NULL DEFAULT '{}',
    "enhance_recipe" JSONB NOT NULL DEFAULT '{}',
    "shoot_advice" JSONB NOT NULL DEFAULT '[]',
    "brand_preset" JSONB NOT NULL DEFAULT '{}',
    "post_variants" JSONB NOT NULL DEFAULT '[]',
    "predictions" JSONB NOT NULL DEFAULT '{}',
    "provider" TEXT NOT NULL DEFAULT 'heuristic',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "os_photo_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "os_photo_sessions_workspace_id_created_at_idx" ON "os_photo_sessions"("workspace_id", "created_at");
DO $$ BEGIN
 ALTER TABLE "os_photo_sessions" ADD CONSTRAINT "os_photo_sessions_workspace_id_fkey"
 FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
