CREATE TABLE IF NOT EXISTS "blog_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" varchar(256) NOT NULL,
	"topic" text NOT NULL,
	"audience" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"research_plan" jsonb,
	"research_brief" text,
	"content" text,
	"meta_title" varchar(256),
	"meta_description" text,
	"citation_report" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blog_research_dossiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"angle" text NOT NULL,
	"queries" jsonb,
	"sources" jsonb,
	"dossier_content" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blog_articles" ADD CONSTRAINT "blog_articles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blog_research_dossiers" ADD CONSTRAINT "blog_research_dossiers_article_id_blog_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."blog_articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_blog_articles_user_id" ON "blog_articles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_blog_research_dossiers_article_id" ON "blog_research_dossiers" USING btree ("article_id");