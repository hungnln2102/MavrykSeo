ALTER TABLE "job_runs" ADD COLUMN IF NOT EXISTS "ingestion_state" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_runs" ADD COLUMN IF NOT EXISTS "ingestion_key" text;--> statement-breakpoint
ALTER TABLE "job_runs" ADD COLUMN IF NOT EXISTS "ingestion_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "job_runs" ADD COLUMN IF NOT EXISTS "ingestion_completed_at" timestamp;--> statement-breakpoint
UPDATE "job_runs" SET "ingestion_key" = "idempotency_key" WHERE "ingestion_key" IS NULL;--> statement-breakpoint
ALTER TABLE "job_runs" ALTER COLUMN "ingestion_key" SET NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_runs_ingestion_key_idx" ON "job_runs" USING btree ("workspace_id","ingestion_key");