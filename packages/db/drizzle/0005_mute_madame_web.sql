CREATE TABLE IF NOT EXISTS "job_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"queue_name" text NOT NULL,
	"job_name" text NOT NULL,
	"bullmq_job_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"correlation_id" text NOT NULL,
	"state" text DEFAULT 'queued' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer NOT NULL,
	"error_code" text,
	"error_message" text,
	"payload" jsonb NOT NULL,
	"completed_at" timestamp,
	"failed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_job_runs_workspace_idempotency" UNIQUE("workspace_id","idempotency_key")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_runs_workspace_state_idx" ON "job_runs" USING btree ("workspace_id","state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_runs_project_state_idx" ON "job_runs" USING btree ("project_id","state");