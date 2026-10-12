-- Lớp bảo vệ cuối ở DB (xem docs/audit mục 12, DECISIONS 2026-10-12):
-- 1) users.role không đổi được sau khi tạo.
-- 2) INSERT tài khoản ADMIN chỉ khi transaction đã SET LOCAL app.allow_admin_insert = 'on' (script CLI / bootstrap).
-- 3) Đặt approved_at cho GV (INSERT có giá trị, hoặc UPDATE từ null) chỉ khi transaction đã SET LOCAL app.allow_teacher_approval = 'on'
--    (admin duyệt / admin tạo GV / xác minh email đúng tên miền trường).
-- Dùng set_config(..., true) trong transaction nên chạy được qua pooler kiểu transaction.
CREATE OR REPLACE FUNCTION users_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'users.role is immutable' USING ERRCODE = '42501';
    END IF;
    IF NEW.role = 'TEACHER' AND OLD.approved_at IS NULL AND NEW.approved_at IS NOT NULL
       AND coalesce(current_setting('app.allow_teacher_approval', true), '') <> 'on' THEN
      RAISE EXCEPTION 'teacher approval is not allowed in this context' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NEW.role = 'ADMIN' AND coalesce(current_setting('app.allow_admin_insert', true), '') <> 'on' THEN
      RAISE EXCEPTION 'admin accounts can only be created by the operator CLI' USING ERRCODE = '42501';
    END IF;
    IF NEW.role = 'TEACHER' AND NEW.approved_at IS NOT NULL
       AND coalesce(current_setting('app.allow_teacher_approval', true), '') <> 'on' THEN
      RAISE EXCEPTION 'teacher approval is not allowed in this context' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER users_guard BEFORE INSERT OR UPDATE ON users FOR EACH ROW EXECUTE FUNCTION users_guard();
