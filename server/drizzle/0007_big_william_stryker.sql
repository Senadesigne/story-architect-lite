ALTER TABLE "projects" ADD COLUMN "point_of_view" text;--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN IF EXISTS "pov_decided";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN IF EXISTS "writing_routine_set";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN IF EXISTS "tools_prepared";