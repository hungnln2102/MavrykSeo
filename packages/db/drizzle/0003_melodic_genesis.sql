ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "plan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "white_label_logo" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "white_label_colors" jsonb;