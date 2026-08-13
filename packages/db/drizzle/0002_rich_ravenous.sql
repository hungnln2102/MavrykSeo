ALTER TABLE "recommendations" ADD COLUMN IF NOT EXISTS "internal_notes" text;--> statement-breakpoint
ALTER TABLE "recommendations" ADD COLUMN IF NOT EXISTS "client_notes" text;