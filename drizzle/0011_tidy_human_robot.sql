CREATE TABLE "bank_questions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"type" "question_type" NOT NULL,
	"prompt" text NOT NULL,
	"points" numeric(6, 2) DEFAULT 1 NOT NULL,
	"topic" text DEFAULT '' NOT NULL,
	"options" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_questions" ADD CONSTRAINT "bank_questions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bank_questions_owner_idx" ON "bank_questions" USING btree ("owner_id","updated_at");