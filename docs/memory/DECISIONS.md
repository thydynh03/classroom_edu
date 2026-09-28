# DECISIONS — nhật ký quyết định (ADR ngắn)

Mỗi mục: ngày · quyết định · lý do · phương án đã loại · trạng thái. Mới nhất ở trên.

---

**2026-09-28 · Quiz dùng thang điểm GV đặt (mặc định 10); điểm từng câu là trọng số** — Đã chốt (Claude).
Lý do: trường học VN chấm thang 10. Trước đó `saveQuestions` ghi đè `max_points` = tổng điểm câu → điểm quiz lệch thang (integration test phát hiện).

**2026-09-28 · Job nhắc hạn chạy bằng setInterval trong instrumentation, không pg-boss/outbox** — Đã chốt (Claude).
Lý do: quy mô nhỏ, 1 instance. Thông báo tạo trong cùng transaction nên không cần outbox. Chuyển sang pg-boss khi chạy nhiều instance (tránh chạy trùng job).

**2026-09-28 · CSP dùng nonce + 'strict-dynamic'** — Đã làm (thay quyết định 'unsafe-inline' trước đó). `src/proxy.ts` sinh nonce mỗi request; root layout đọc `x-nonce` (mọi trang thành dynamic, chấp nhận vì app gần như toàn trang cá nhân hóa). style-src vẫn 'unsafe-inline' (Next/Radix dùng inline style).

**2026-09-28 · Trang ADMIN chỉ quản lý tài khoản** — Admin khóa/mở, cấp mật khẩu tạm, tạo giáo viên, xem nhật ký; KHÔNG xem bài làm/điểm (privacy). Mọi thao tác ghi audit_logs.

**2026-09-28 · Quét virus bằng ClamAV (clamd INSTREAM, tự viết client) khi xác nhận upload** — Đã chốt. Fail closed: không quét được thì không nhận file. Tắt bằng cách bỏ trống `CLAMAV_HOST` (chỉ dev). File nhiễm → status INFECTED + audit log.

**2026-09-28 · Lên lịch đăng: status SCHEDULED + job mỗi phút** — UPDATE có điều kiện status để 2 lần chạy song song không đăng trùng.

**2026-09-28 · Form dùng useActionState + Server Actions, không React Hook Form** — Đã chốt (Claude). Ít JS phía client, validate một chỗ ở server.

**2026-09-28 · Auth tự viết (session DB + argon2id) thay Better Auth** — Đã chốt (Claude, khi tự code M1).
Lý do: nghiệp vụ cần username, mật khẩu tạm, GV cấp lại mật khẩu, khóa tài khoản — đều phải tự viết dù dùng Better Auth; tự viết ít phụ thuộc, kiểm soát được cookie/session. Session token ngẫu nhiên 32 byte, DB chỉ lưu SHA-256.

**2026-09-28 · MVP chỉ dùng Server Actions (không REST /api/v1), đề bài là văn bản thuần** — Đã chốt (Claude).
Lý do: một client duy nhất là web; server action có kiểm tra Origin sẵn. Đề bài plain text + xuống dòng thay TipTap: không cần sanitize HTML, giảm rủi ro XSS. Route handler duy nhất: tải file (redirect presigned URL). Nâng lên REST/rich text ở Phase 2 nếu cần.

**2026-09-28 · Quiz: 1 lượt làm, đáp án lưu trong submission (jsonb)** — thay bảng quiz_attempt/attempt_answer. Đủ cho MVP; Phase 2 tách bảng khi có nhiều lượt.

**2026-09-28 · Storage dev: SeaweedFS thay MinIO** — Đã chốt (Claude).
Lý do: MinIO ngừng phát hành image Docker công khai (pull bị từ chối cả Docker Hub lẫn quay.io). SeaweedFS có S3 API, key dev trong `docker/seaweedfs/s3.json`. Bucket dev tạo bằng CreateBucket khi app khởi động ở dev (M3).

**2026-09-28 · Thiết lập Design Tokens Tailwind v4 @theme inline + Shadcn UI thuần token dự án** — Đã thực hiện (M0b).
Lý do: Khai báo toàn bộ token từ `docs/DESIGN_SYSTEM.md` (hướng D cho light, hướng E cho dark, 6 màu pastel) vào CSS variables và map qua `@theme inline` của Tailwind v4. Toàn bộ 16 component shadcn/ui được tinh chỉnh để chỉ dùng tokens này (nút/input bo 14px, card bo 22px, badge full, focus ring 2px, shadow primary); loại bỏ hoàn toàn các biến màu oklch mặc định của shadcn.
Trạng thái: Hoàn thành trong M0b.

**2026-09-28 · Khởi tạo stack M0a: Next.js 16.3.6, React 19.2.8, Tailwind CSS 4.3.3, TypeScript 5.9.3, Vitest 3.2.7** — Đã thực hiện.
Lý do: Next.js 16 (App Router + Turbopack), React 19, Tailwind CSS v4 là bản stable mới nhất khi scaffold bằng create-next-app và pnpm; Vitest 3 cho tốc độ chạy test nhanh và native ES module support.
Trạng thái: Hoàn thành trong M0a.

**2026-09-28 · Thiết kế: D làm nền + heatmap G + focus mode E + dark mode E** — Đã chốt (người dùng).
Lý do: D đẹp, thân thiện, dễ dựng bằng shadcn; heatmap G giúp GV thấy HS bỏ bài; focus mode E giúp chấm nhanh; bảng màu E cho dark mode.
Loại: A/B/C (vòng 1), F (quá trẻ con cho THPT), G toàn phần (lạnh với HS).

**2026-09-28 · Một app Next.js, không monorepo, jobs chạy trong process web** — Đã chốt.
Lý do: người dùng xác nhận quy mô nhỏ ("kiến trúc không nhiều đến vậy"). Giữ ranh giới module trong `src/server/*` để tách sau.
Loại: monorepo apps/web + apps/worker + packages/* (quá nặng cho MVP).

**2026-09-28 · Implementer chính là agy (Antigravity)** — Đã chốt (người dùng). Claude là orchestrator/reviewer.

**2026-09-28 · Storage qua interface `StorageProvider` (S3 API); dev MinIO, prod R2** — Tạm chốt, chờ người dùng xác nhận R2 hay Cloudinary.
Lý do: R2 free 10GB, không phí egress, bucket private, đổi nhà cung cấp dễ. Cloudinary free giới hạn 10MB/file, chặn PDF mặc định.

**2026-09-28 · Tài khoản học sinh: username bắt buộc, email tùy chọn; mật khẩu tạm + bắt buộc đổi lần đầu** — Đã chốt.
Lý do: nhiều HS phổ thông không có email riêng.

**2026-09-28 · Better Auth, session lưu DB (không JWT)** — Đã chốt. Lý do: thu hồi phiên được, dữ liệu HS không ra bên thứ ba.

**2026-09-28 · `is_late` là cờ, không phải trạng thái; lịch sử chấm append-only** — Đã chốt.

## 2026-09-29 — Chuyển deploy từ Render sang Vercel
Người dùng muốn cả app trên Vercel. Serverless không có process sống lâu nên: job chạy qua `/api/cron` (bảo vệ bằng `CRON_SECRET`; Hobby chỉ 1 lần/ngày, cron ngoài gọi thêm), bài lên lịch được đăng "lười" bằng `after()` trong layout GV/HS, migration chạy trong `vercel-build`. ClamAV tắt. Dockerfile giữ lại cho Render/VPS.
