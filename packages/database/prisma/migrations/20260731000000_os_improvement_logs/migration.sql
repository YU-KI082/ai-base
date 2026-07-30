-- CreateTable
CREATE TABLE IF NOT EXISTS "os_improvement_logs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "date_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cause" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL DEFAULT '',
    "result" TEXT NOT NULL DEFAULT '',
    "platform" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "os_improvement_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "os_improvement_logs_workspace_id_date_key_idx" ON "os_improvement_logs"("workspace_id", "date_key");
CREATE INDEX IF NOT EXISTS "os_improvement_logs_workspace_id_created_at_idx" ON "os_improvement_logs"("workspace_id", "created_at");

DO $$ BEGIN
 ALTER TABLE "os_improvement_logs" ADD CONSTRAINT "os_improvement_logs_workspace_id_fkey"
 FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
