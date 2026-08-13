ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "crawl_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "crawl_max_concurrent_jobs" integer;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "crawl_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "crawl_max_concurrent_jobs" integer DEFAULT 2 NOT NULL;