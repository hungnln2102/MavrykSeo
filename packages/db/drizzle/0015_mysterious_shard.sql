CREATE TABLE IF NOT EXISTS "audit_control_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_run_id" uuid NOT NULL,
	"control_id" uuid NOT NULL,
	"result" text DEFAULT 'NEED_DATA' NOT NULL,
	"exception_reason" text,
	"reviewer_id" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_run_control" UNIQUE("audit_run_id","control_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_controls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"code" text NOT NULL,
	"phase" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_control_version" UNIQUE("version_id","code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "audit_modules_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"standard_version_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"scope_snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "control_sources" (
	"control_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	CONSTRAINT "uniq_control_source" UNIQUE("control_id","source_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gsc_oauth_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"state_hash" text NOT NULL,
	"encrypted_code_verifier" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gsc_oauth_states_state_hash_unique" UNIQUE("state_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gsc_sync_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"state" text DEFAULT 'property_selected' NOT NULL,
	"last_successful_sync_at" timestamp,
	"last_sync_started_at" timestamp,
	"last_sync_start_date" text,
	"last_sync_end_date" text,
	"last_error_code" text,
	"last_error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gsc_sync_states_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "standard_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"authority_level" text NOT NULL,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "standard_sources_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "standard_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" text NOT NULL,
	"effective_at" timestamp NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"source_manifest_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "standard_versions_version_unique" UNIQUE("version")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_control_results" ADD CONSTRAINT "audit_control_results_audit_run_id_audit_runs_id_fk" FOREIGN KEY ("audit_run_id") REFERENCES "public"."audit_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_control_results" ADD CONSTRAINT "audit_control_results_control_id_audit_controls_id_fk" FOREIGN KEY ("control_id") REFERENCES "public"."audit_controls"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_control_results" ADD CONSTRAINT "audit_control_results_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_controls" ADD CONSTRAINT "audit_controls_version_id_standard_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."standard_versions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_controls" ADD CONSTRAINT "audit_controls_module_id_audit_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."audit_modules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_runs" ADD CONSTRAINT "audit_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_runs" ADD CONSTRAINT "audit_runs_standard_version_id_standard_versions_id_fk" FOREIGN KEY ("standard_version_id") REFERENCES "public"."standard_versions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "control_sources" ADD CONSTRAINT "control_sources_control_id_audit_controls_id_fk" FOREIGN KEY ("control_id") REFERENCES "public"."audit_controls"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "control_sources" ADD CONSTRAINT "control_sources_source_id_standard_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."standard_sources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gsc_oauth_states" ADD CONSTRAINT "gsc_oauth_states_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gsc_oauth_states" ADD CONSTRAINT "gsc_oauth_states_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gsc_sync_states" ADD CONSTRAINT "gsc_sync_states_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gsc_sync_states" ADD CONSTRAINT "gsc_sync_states_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gsc_oauth_states_workspace_project_idx" ON "gsc_oauth_states" USING btree ("workspace_id","project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gsc_oauth_states_expires_at_idx" ON "gsc_oauth_states" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gsc_sync_states_workspace_state_idx" ON "gsc_sync_states" USING btree ("workspace_id","state");