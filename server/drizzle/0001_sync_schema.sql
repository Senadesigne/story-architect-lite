-- Manually created migration to synchronize DB schema with Codebase [Forced Update 3]
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "premise" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "theme" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "genre" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "audience" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "point_of_view" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "beat_sheet_setup" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "beat_sheet_inciting_incident" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "beat_sheet_midpoint" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "beat_sheet_climax" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "beat_sheet_falling_action" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "synopsis" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "outline_notes" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "rules_definition" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "culture_and_history" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "brainstorming" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "research" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "story_idea" text;
ALTER TABLE "projects" DROP COLUMN IF EXISTS "logline";