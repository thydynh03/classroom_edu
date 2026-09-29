ALTER TABLE "users" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
-- Tài khoản có từ trước khi có bước duyệt GV coi như đã duyệt, để không ai bị khóa ngoài.
UPDATE "users" SET "approved_at" = "created_at" WHERE "approved_at" IS NULL;
