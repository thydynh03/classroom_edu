CREATE TYPE "public"."invite_status" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "class_invites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"class_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"invited_by" uuid NOT NULL,
	"status" "invite_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "email_sends" (
	"day" text NOT NULL,
	"kind" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "email_sends_day_kind_pk" PRIMARY KEY("day","kind")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "email_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "email_last_error" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "email_next_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "class_invites" ADD CONSTRAINT "class_invites_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_invites" ADD CONSTRAINT "class_invites_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_invites" ADD CONSTRAINT "class_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "class_invites_pending_uq" ON "class_invites" USING btree ("class_id","student_id") WHERE "class_invites"."status" = 'PENDING';--> statement-breakpoint
CREATE INDEX "class_invites_student_idx" ON "class_invites" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_email_queue_idx" ON "notifications" USING btree ("created_at") WHERE "notifications"."email_sent_at" is null;