CREATE TABLE IF NOT EXISTS "editor_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"prompt" text NOT NULL,
	"content" text NOT NULL,
	"model" text DEFAULT 'gemini-1.5-pro',
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "editor_analyses" ADD CONSTRAINT "editor_analyses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "editor_analyses" ADD CONSTRAINT "editor_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_editor_analyses_project_id" ON "editor_analyses" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_editor_analyses_user_id" ON "editor_analyses" USING btree ("user_id");