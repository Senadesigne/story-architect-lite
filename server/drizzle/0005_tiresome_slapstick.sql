CREATE TABLE IF NOT EXISTS "user_style_fingerprints" (
	"user_id" text PRIMARY KEY NOT NULL,
	"avg_sentence_length" integer,
	"tone" jsonb,
	"signature_phrases" text[],
	"sentence_patterns" text,
	"vocabulary_level" text,
	"sample_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_writing_samples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"text" text NOT NULL,
	"word_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "story_architect_embeddings" ALTER COLUMN "vector" SET DATA TYPE vector(768);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_style_fingerprints" ADD CONSTRAINT "user_style_fingerprints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_writing_samples" ADD CONSTRAINT "user_writing_samples_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_writing_samples_user_id" ON "user_writing_samples" USING btree ("user_id");