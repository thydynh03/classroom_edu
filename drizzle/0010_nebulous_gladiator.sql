ALTER TABLE "submissions" ADD COLUMN "content_format" text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "note" text DEFAULT '' NOT NULL;