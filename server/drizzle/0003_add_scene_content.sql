ALTER TABLE "scenes" ADD COLUMN "content" text;
UPDATE scenes SET content = summary WHERE length(summary) > 200;
UPDATE scenes SET summary = NULL WHERE length(summary) > 200;