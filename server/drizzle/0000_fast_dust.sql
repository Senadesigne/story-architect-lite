CREATE TABLE IF NOT EXISTS "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256) NOT NULL,
	"role" text,
	"motivation" text,
	"goal" text,
	"fear" text,
	"backstory" text,
	"arc_start" text,
	"arc_end" text,
	"project_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" text,
	"project_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"logline" text,
	"premise" text,
	"theme" text,
	"genre" text,
	"audience" text,
	"brainstorming" text,
	"research" text,
	"rules_definition" text,
	"culture_and_history" text,
	"synopsis" text,
	"outline_notes" text,
	"point_of_view" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(256) NOT NULL,
	"summary" text,
	"order" integer DEFAULT 0 NOT NULL,
	"project_id" uuid NOT NULL,
	"location_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_architect_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"vector" "vector(1536)" NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_characters_project_id" ON "characters" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_locations_project_id" ON "locations" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_projects_user_id" ON "projects" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scenes_project_id" ON "scenes" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scenes_order" ON "scenes" ("project_id","order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scenes_location_id" ON "scenes" ("location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_embeddings_created_at" ON "story_architect_embeddings" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "characters" ADD CONSTRAINT "characters_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "locations" ADD CONSTRAINT "locations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scenes" ADD CONSTRAINT "scenes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scenes" ADD CONSTRAINT "scenes_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
