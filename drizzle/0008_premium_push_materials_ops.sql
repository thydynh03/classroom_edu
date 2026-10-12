CREATE TYPE "public"."upgrade_status" AS ENUM('NEW', 'CONTACTED', 'GRANTED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "class_materials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"class_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"route" text NOT NULL,
	"value" numeric(12, 3),
	"device" text,
	"network" text
);
--> statement-breakpoint
CREATE TABLE "error_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"route" text NOT NULL,
	"route_type" text NOT NULL,
	"method" text,
	"digest" text,
	"message" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_grants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"feature_key" text NOT NULL,
	"granted_by" uuid,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"request_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"job" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"ok" boolean DEFAULT false NOT NULL,
	"result" jsonb
);
--> statement-breakpoint
CREATE TABLE "material_attachments" (
	"material_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	CONSTRAINT "material_attachments_material_id_file_id_pk" PRIMARY KEY("material_id","file_id")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"last_success_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_samples" (
	"id" uuid PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"method" text NOT NULL,
	"route" text NOT NULL,
	"status" integer NOT NULL,
	"duration_ms" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upgrade_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"requester_id" uuid NOT NULL,
	"feature_key" text NOT NULL,
	"plan" text NOT NULL,
	"contact" text,
	"note" text,
	"status" "upgrade_status" DEFAULT 'NEW' NOT NULL,
	"admin_note" text,
	"handled_by" uuid,
	"handled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid,
	"role" text NOT NULL,
	"event" text NOT NULL,
	"device" text,
	"meta" jsonb
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "grade_weight" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "push_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "reauth_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "class_materials" ADD CONSTRAINT "class_materials_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_materials" ADD CONSTRAINT "class_materials_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_grants" ADD CONSTRAINT "feature_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_grants" ADD CONSTRAINT "feature_grants_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_grants" ADD CONSTRAINT "feature_grants_request_id_upgrade_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."upgrade_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_attachments" ADD CONSTRAINT "material_attachments_material_id_class_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."class_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_attachments" ADD CONSTRAINT "material_attachments_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upgrade_requests" ADD CONSTRAINT "upgrade_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upgrade_requests" ADD CONSTRAINT "upgrade_requests_handled_by_users_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_events" ADD CONSTRAINT "user_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "class_materials_class_idx" ON "class_materials" USING btree ("class_id","created_at");--> statement-breakpoint
CREATE INDEX "client_events_at_idx" ON "client_events" USING btree ("at","kind");--> statement-breakpoint
CREATE INDEX "error_events_at_idx" ON "error_events" USING btree ("at");--> statement-breakpoint
CREATE INDEX "feature_grants_user_idx" ON "feature_grants" USING btree ("user_id","feature_key");--> statement-breakpoint
CREATE INDEX "job_runs_started_idx" ON "job_runs" USING btree ("job","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_uq" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "request_samples_at_idx" ON "request_samples" USING btree ("at");--> statement-breakpoint
CREATE UNIQUE INDEX "upgrade_requests_open_uq" ON "upgrade_requests" USING btree ("requester_id","feature_key") WHERE "upgrade_requests"."status" in ('NEW', 'CONTACTED');--> statement-breakpoint
CREATE INDEX "upgrade_requests_status_idx" ON "upgrade_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "user_events_at_idx" ON "user_events" USING btree ("at");--> statement-breakpoint
CREATE INDEX "user_events_user_idx" ON "user_events" USING btree ("user_id","at");