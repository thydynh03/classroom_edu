ALTER TYPE "public"."assignment_status" ADD VALUE 'SCHEDULED' BEFORE 'PUBLISHED';--> statement-breakpoint
ALTER TYPE "public"."file_status" ADD VALUE 'INFECTED' BEFORE 'DELETED';--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "publish_at" timestamp with time zone;