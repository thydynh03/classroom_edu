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

## Deploy (Vercel)

Cả app (giao diện + server actions) chạy trên Vercel, region `sin1`. `pnpm vercel-build` chạy migration + tạo admin đầu tiên (`docker/migrate.mjs`) rồi mới `next build`.

- Job nền: không có `setInterval` trên serverless. Bài lên lịch được đăng khi có người mở trang GV/HS (tối đa 1 lần/phút) và qua `/api/cron`. Vercel Hobby chỉ cho cron **1 lần/ngày**, nên muốn nhắc hạn đều hơn thì tạo cron miễn phí ở cron-job.org gọi `GET /api/cron` mỗi 15 phút với header `Authorization: Bearer <CRON_SECRET>`.
- ClamAV không chạy được trên Vercel: để trống `CLAMAV_HOST` (tắt quét).
- Rate limit đăng nhập nằm trong bộ nhớ từng instance, nên trên serverless chỉ mang tính tương đối (khóa tài khoản sau 10 lần sai vẫn lưu trong DB).

Biến môi trường (Project → Settings → Environment Variables; secret thì bạn tự đặt, không commit):

| Biến | Ghi chú |
| --- | --- |
| `DATABASE_URL` | **External** URL Postgres (Render/Neon), thêm `?sslmode=require`. Cần có cả lúc build (migration) |
| `APP_URL` | URL public, ví dụ `https://classroom-edu.vercel.app` |
| `CRON_SECRET` | Chuỗi ngẫu nhiên ≥ 32 ký tự; Vercel Cron tự gửi header này |
| `BOOTSTRAP_ADMIN_USERNAME` / `BOOTSTRAP_ADMIN_PASSWORD` | Tạo admin đầu tiên (mật khẩu ≥ 12 ký tự). Xóa mật khẩu sau khi đăng nhập |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION=auto`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE=false` | Cloudflare R2. Chưa đặt thì upload báo "chưa cấu hình" |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Gửi email. Chưa đặt thì không gửi |

`Dockerfile` vẫn giữ để chạy trên Render/VPS nếu cần (ở đó job chạy bằng `setInterval`).

## Quy tắc cho người và AI agent

Đọc `AGENTS.md` trước. Kiến trúc: `docs/ARCHITECTURE.md`. Thiết kế: `docs/DESIGN_SYSTEM.md`. Tiến độ và bài học: `docs/memory/`.
