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

## Deploy

- `Dockerfile` build Next.js standalone. Chạy `pnpm db:migrate` (với `DATABASE_URL` production) trước mỗi lần deploy.
- Biến môi trường: xem `.env.example`. Production cần thêm `S3_PUBLIC_ORIGIN` nếu endpoint S3 khác origin trình duyệt truy cập.

## Quy tắc cho người và AI agent

Đọc `AGENTS.md` trước. Kiến trúc: `docs/ARCHITECTURE.md`. Thiết kế: `docs/DESIGN_SYSTEM.md`. Tiến độ và bài học: `docs/memory/`.
