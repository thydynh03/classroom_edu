# classroom_edu

Website giao bài tập và quản lý học tập cho giáo viên và học sinh: lớp học, giao bài (tự luận + trắc nghiệm tự chấm), nộp bài bằng điện thoại, chấm bài có chế độ tập trung, heatmap theo dõi lớp, thông báo.

## Yêu cầu

- Node 24, pnpm 9, Docker

## Chạy local

```bash
pnpm install
cp .env.example .env        # đổi SEED_PASSWORD nếu muốn
pnpm db:up                  # Postgres :55432, S3 (SeaweedFS) :9000, Mailpit :8025, ClamAV :3310
pnpm db:reset               # xóa DB dev → migrate → seed dữ liệu mẫu
pnpm dev
```

Tài khoản mẫu (mật khẩu = `SEED_PASSWORD` trong `.env`):

| Vai trò | Tên đăng nhập |
| --- | --- |
| Giáo viên | `co.ha`, `thay.quang` |
| Quản trị | `admin` (trang `/admin`) |
| Học sinh | `tranminhkhoa`, `lehoanganh`, … (`maithao` phải đổi mật khẩu lần đầu) |
| Link tham gia lớp | `/join/TOAN10A1` |

Email (xác minh, quên mật khẩu, thông báo) xem tại Mailpit: http://localhost:8025

## Kiểm tra

```bash
pnpm lint && pnpm typecheck && pnpm test   # unit
pnpm test:int                              # integration (Testcontainers, cần Docker)
pnpm test:e2e                              # Playwright, cần DB đã seed
```

## Deploy (Render)

Image Docker tự chạy migration khi khởi động (`docker/migrate.mjs`) rồi mới chạy app.

Biến môi trường cần đặt trên Render (secret thì đặt trong dashboard, không commit):

| Biến | Ghi chú |
| --- | --- |
| `DATABASE_URL` | Internal Database URL của Postgres trên Render (secret) |
| `APP_URL` | URL public của web service |
| `BOOTSTRAP_ADMIN_USERNAME` / `BOOTSTRAP_ADMIN_PASSWORD` | Tạo admin đầu tiên nếu DB chưa có admin (mật khẩu ≥ 12 ký tự, secret). Xóa mật khẩu sau khi đăng nhập. |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION=auto`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE=false` | Cloudflare R2. Chưa đặt thì upload file báo "chưa cấu hình" |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Gửi email (Resend SMTP). Chưa đặt thì không gửi email |
| `CLAMAV_HOST`, `CLAMAV_PORT` | Quét virus. Chưa đặt thì tắt quét (gói free không đủ RAM chạy ClamAV) |

Giáo viên đăng ký tự do cần email xác minh. Khi chưa có SMTP, admin tạo tài khoản giáo viên ở `/admin`.

## Quy tắc cho người và AI agent

Đọc `AGENTS.md` trước. Kiến trúc: `docs/ARCHITECTURE.md`. Thiết kế: `docs/DESIGN_SYSTEM.md`. Tiến độ và bài học: `docs/memory/`.
