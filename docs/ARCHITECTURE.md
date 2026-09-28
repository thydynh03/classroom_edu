# ARCHITECTURE — classroom_edu

Nguyên tắc: **một app Next.js, một Postgres**. Ranh giới module rõ ràng để sau này tách được, nhưng không tách sớm.
Tài liệu này mô tả code **đang chạy** (cập nhật 28/09/2026 sau khi hoàn thành MVP). Lý do các thay đổi so với kế hoạch ban đầu: `docs/memory/DECISIONS.md`.

## Stack

| Lớp          | Đang dùng                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| Runtime      | Node 24, pnpm 9                                                                                             |
| App          | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript `strict`                                          |
| UI           | Tailwind CSS v4 + shadcn/ui (Radix) + lucide-react; sonner (toast); next-themes (dark mode)                 |
| Form         | `useActionState` + Server Actions; Zod validate phía server (form thuần, không React Hook Form)             |
| DB           | PostgreSQL 16 + Drizzle ORM + drizzle-kit (migration trong `drizzle/`)                                      |
| Auth         | Tự viết: session lưu DB (token 32 byte, DB chỉ lưu SHA-256), cookie httpOnly, argon2id (`@node-rs/argon2`) |
| Storage      | S3 API (`@aws-sdk/client-s3` + presigner). Dev: SeaweedFS (docker). Prod: Cloudflare R2                    |
| Jobs         | `setInterval` 15 phút trong process web, khởi động từ `src/instrumentation.ts`                              |
| Email        | nodemailer qua SMTP. Dev: Mailpit (UI :8025). Prod: SMTP của Resend                                        |
| Test         | Vitest (unit), Vitest + Testcontainers (integration), Playwright + axe-core (E2E)                           |
| Deploy       | `Dockerfile` (Next standalone) → Render (1 web service + managed Postgres)                                  |

Không thêm thư viện ngoài bảng này khi chưa ghi ADR vào `docs/memory/DECISIONS.md`.

## Cổng dịch vụ local

| Dịch vụ    | Cổng                                                        |
| ---------- | ----------------------------------------------------------- |
| Postgres   | `55432` (5432 thường bị Postgres cài sẵn trên máy chiếm)     |
| S3 (Seaweed) | `9000`, key dev trong `docker/seaweedfs/s3.json`           |
| Mailpit    | SMTP `1025`, giao diện `8025`                                |
| ClamAV     | clamd `3310` (lần đầu cần vài phút tải chữ ký)               |
| E2E server | `3200` (Playwright tự chạy `next dev --port 3200`)          |

## Cấu trúc thư mục

```
src/
  app/
    (auth)/                 login, register, forgot/reset-password, verify-email, change-password + actions.ts
    (teacher)/teacher/      dashboard, classes, assignments (+ questions, edit), grading, notifications + actions.ts
    (student)/student/      trang chủ (Hôm nay), classes, assignments/[id], grades, notifications + actions.ts
    join/[code]/            HS tham gia lớp bằng mã (tạo tài khoản + vào lớp)
    settings/               tài khoản, thiết bị đang đăng nhập
    admin/                  quản trị tài khoản + nhật ký (chỉ ADMIN)
    files/[id]/route.ts     tải file: kiểm tra quyền → redirect presigned URL 5 phút
    files/actions.ts        xin URL upload, xác nhận upload
    n/[id]/route.ts         mở thông báo: đánh dấu đã đọc → chuyển trang
    account-actions.ts      đánh dấu đã đọc, thu hồi phiên, tham gia lớp
    dev/ui/                 catalog design system (chỉ dev)
  components/
    ui/                     shadcn primitives (đã chỉnh token)
    domain/                 AssignmentRow, SubmissionStatusBadge, FileUploader, Heatmap, NotificationList, page-parts…
    layout/                 AppRail, TopBar, MobileTabBar, ThemeToggle
    forms/                  Field, FormAlert, SubmitButton
  server/
    db/                     schema.ts, client.ts
    auth/                   session.ts (getActor, createSession…), guard.ts (requireActor), password.ts, tokens.ts
    policy/                 requireTeacherOfClass, requireAssignmentForStudent, requireSubmissionForTeacher…
    services/               classes, assignments, submissions (nộp + chấm), files, notifications, dashboard,
                            quiz-grading (thuần), submission-rules (thuần), errors (UserError)
    storage/                s3.ts (StorageProvider), file-rules.ts (allowlist, magic bytes)
    jobs/                   deadlines.ts (nhắc hạn, quá hạn, gửi email)
    validation/             Zod schema
  lib/                      dates (giờ VN), format ("8,5"), now (requestNow cho Server Component), action helpers
scripts/                    migrate.ts, seed.ts, reset.ts
tests/
  unit/ integration/ e2e/
```

Quy tắc phụ thuộc: `app → services → policy → db`. Component UI không import `server/db`.
Server Action chỉ: xác thực (`requireActor`) → validate Zod → gọi service → `revalidatePath`. Logic nằm trong service.

## Server Actions thay cho REST

MVP chỉ có một client (web) nên dùng Server Actions (Next kiểm tra Origin sẵn → chống CSRF).
Route handler duy nhất: tải file và mở thông báo. Học sinh **không** có thao tác nào nhận id bài nộp: mọi thao tác HS dùng `assignmentId` + actor lấy từ session.

## Dữ liệu

Bảng: `users`, `sessions`, `auth_tokens`, `classes` (có `join_code`), `class_members`, `assignments`, `files`,
`assignment_attachments`, `questions`, `question_options`, `submissions` (đáp án quiz trong `quiz_answers` jsonb),
`submission_files`, `grade_events`, `notifications`, `audit_logs`. Schema: `src/server/db/schema.ts`.

- PK: UUIDv7. `created_at`/`updated_at` ở các bảng nghiệp vụ.
- Unique: `lower(username)`, `lower(email)`, `class_members(class_id,user_id)`, `submissions(assignment_id,student_id)`, `classes.join_code`, `notifications.dedupe_key`, `sessions.token_hash`.
- Bài tập giao nhiều lớp = nhiều bản ghi chung `group_id`.
- `grade_events` chỉ INSERT (lịch sử chấm). `submissions.score/feedback` là giá trị hiện tại.
- HS rời lớp: `class_members.status = REMOVED`, bài nộp giữ nguyên.

## Phân quyền

- `getActor()` (cache theo request) đọc cookie → session còn hạn → user ACTIVE. Trả null nếu không hợp lệ.
- `requireActor(role?)`: chưa đăng nhập → `/login`; còn mật khẩu tạm → `/change-password`; sai role → 404.
- Mọi service nhận `actor` và gọi hàm trong `src/server/policy` trước khi đọc/ghi. Quan hệ quyết định bằng `class_members`.
- Không có quyền hoặc id không phải UUID → `notFound()` (404).
- Được kiểm chứng bằng `tests/integration/authorization.test.ts`.

## Bảo mật

- Cookie `__Host-ce_session` (prod), httpOnly, Secure, SameSite=Lax; session 14 ngày trượt.
- Đăng nhập: thông báo lỗi chung chung, khóa 15 phút sau 10 lần sai, rate limit theo IP; hash giả khi user không tồn tại (cân bằng thời gian).
- Đổi/đặt lại mật khẩu thu hồi các phiên khác. Token reset/verify: 32 byte, lưu hash, 1 lần, hết hạn 30 phút / 24 giờ.
- Đề bài, nhận xét là văn bản thuần (React escape) → không có HTML do người dùng nhập.
- CSP có nonce theo request (`src/proxy.ts`, script `strict-dynamic`). Header khác (`nosniff`, `Referrer-Policy`, `X-Frame-Options`, HSTS prod) trong `next.config.ts`.
- Rate limit trong bộ nhớ (`src/server/rate-limit.ts`) — đủ cho 1 instance; chuyển Redis khi scale.

## File upload

1. `requestUploadAction` (purpose, tên, MIME, size) → kiểm tra quyền, allowlist đuôi+MIME, size → `files` `PENDING` → presigned PUT 5 phút.
2. Trình duyệt upload thẳng lên storage. Ảnh JPEG/PNG/WebP được vẽ lại qua canvas: ≤ 2000px và **mất EXIF (GPS)**.
3. `completeUploadAction` → HEAD khớp size, đọc 16 byte đầu khớp magic bytes, quét ClamAV (clamd :3310) → `READY` (sai loại → `DELETED`, có virus → `INFECTED`).
4. Tải: `/files/[id]` kiểm tra quyền → presigned GET 5 phút; `inline` chỉ cho ảnh/PDF.

- Key: `sub/{classId}/{assignmentId}/{studentId}/{fileId}`, `att/{classId}/{fileId}`. Không chứa tên gốc.
- Giới hạn: bài nộp 25MB/file, 10 file; tài liệu GV 50MB. Chặn svg, html, file thực thi.
- S3Client đặt `requestChecksumCalculation: "WHEN_REQUIRED"` (nếu không, presigned PUT từ trình duyệt bị 400).

## Thông báo

- Tạo `notifications` **trong cùng transaction** với hành động (đăng bài, nộp, trả bài), chống trùng bằng `dedupe_key`.
- Job mỗi phút: đăng bài đã lên lịch (SCHEDULED → PUBLISHED + thông báo).
- Job 15 phút (`src/server/jobs/deadlines.ts`): nhắc "sắp đến hạn" 24h trước (1 lần/hạn), "quá hạn" (1 lần), gửi email chờ.
- Email chỉ cho: bài mới, sắp đến hạn, đã trả bài. Không gửi 21:30–6:30 (giờ VN). Nội dung chỉ tiêu đề + link.
- Tắt job khi cần: `DISABLE_SCHEDULER=1`.
