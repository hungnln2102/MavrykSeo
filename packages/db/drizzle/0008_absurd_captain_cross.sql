CREATE TABLE IF NOT EXISTS "ingestion_fences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"ingestion_key" text NOT NULL,
	"owner_idempotency_key" text NOT NULL,
	"state" text DEFAULT 'writing' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_ingestion_fences_workspace_key" UNIQUE("workspace_id","ingestion_key")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ingestion_fences" ADD CONSTRAINT "ingestion_fences_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ingestion_fences_workspace_state_idx" ON "ingestion_fences" USING btree ("workspace_id","state");