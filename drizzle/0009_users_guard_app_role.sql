-- Bổ sung cho users_guard (0005): role ứng dụng `classroom_app` (scripts/sql/app-role.sql) KHÔNG BAO GIỜ tạo được ADMIN,
-- kể cả khi tự bật cờ app.allow_admin_insert (vd qua SQL injection). Chỉ role chủ (script CLI, bootstrap) tạo được.
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
    IF NEW.role = 'ADMIN' AND (current_user = 'classroom_app' OR coalesce(current_setting('app.allow_admin_insert', true), '') <> 'on') THEN
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
