CREATE INDEX IF NOT EXISTS "idx_characters_project_id" ON "characters" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_locations_project_id" ON "locations" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_projects_user_id" ON "projects" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scenes_project_id" ON "scenes" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scenes_order" ON "scenes" ("project_id","order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scenes_location_id" ON "scenes" ("location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");