-- Postgres role riêng cho ứng dụng (khuyến nghị, audit mục 12.3-F).
-- App chỉ có quyền đọc/ghi dữ liệu, KHÔNG là chủ bảng nên không tắt/xóa được trigger users_guard,
-- không đổi schema. Kể cả khi có lỗi SQL injection cũng không tạo được ADMIN hay đổi vai trò.
-- Migration vẫn chạy bằng role chủ qua DIRECT_URL. Chạy file này MỘT LẦN bằng role chủ (vd postgres):
--   psql "$DIRECT_URL" -v app_password="'<mật khẩu mạnh>'" -f scripts/sql/app-role.sql
-- Rồi đặt DATABASE_URL của app dùng user classroom_app (Supabase: dùng chuỗi pooler với user classroom_app.<project-ref>).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'classroom_app') THEN
    CREATE ROLE classroom_app LOGIN NOINHERIT;
  END IF;
END $$;
ALTER ROLE classroom_app WITH PASSWORD :app_password;

GRANT USAGE ON SCHEMA public TO classroom_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO classroom_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO classroom_app;
-- Bảng do migration tạo sau này cũng tự cấp quyền (migration chạy bằng role chủ hiện tại)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO classroom_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO classroom_app;
-- unaccent() dùng trong tìm kiếm người dùng
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO classroom_app;
