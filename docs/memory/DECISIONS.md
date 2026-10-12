# DECISIONS — nhật ký quyết định (ADR ngắn)

Mỗi mục: ngày · quyết định · lý do · phương án đã loại · trạng thái. Mới nhất ở trên.

---

**2026-10-12 · Thư viện mới: mammoth, web-push, @opentelemetry/sdk-trace-node** — Đã chốt (Claude, theo plan người dùng duyệt).
- `mammoth`: đọc .docx ở server để nhập đề (map `u => u` để giữ gạch chân). Loại: tự giải nén docx (dễ sai định dạng), xử lý ở client (không chặn được quyền ở server).
- `web-push` + VAPID: chuẩn Web Push, không phụ thuộc nhà cung cấp. Loại: Firebase Cloud Messaging (thêm tài khoản Google, SDK nặng), OneSignal (dữ liệu HS ra bên thứ ba).
- OpenTelemetry (NodeTracerProvider + span processor tự viết ghi vào Postgres): lấy thời gian render thật từ span `BaseServer.handleRequest` có `next.route` (span không có `next.route` là lần chạy proxy.ts, luôn 200). Loại: `@vercel/otel` + dịch vụ ngoài (thêm chi phí, khách muốn xem trong trang admin), Sentry (để dành cho stack trace sau này).

**2026-10-12 · Tính năng trả phí mở khóa theo từng giáo viên, thanh toán thủ công** — Đã làm (người dùng: hệ thống nhiều GV, khách là một GV). `upgrade_requests` + `feature_grants` (có hạn, gia hạn cộng dồn), chặn ở server bằng `requireFeature`. HS không thấy màn hình trả phí. Giá/thông tin chuyển khoản admin tự sửa. Loại: cổng thanh toán tự động (payOS/VNPay) — để giai đoạn sau khi có giấy phép/hóa đơn.

**2026-10-12 · Số liệu vận hành và hành vi lưu trong Postgres của app** — Đã làm. Bảng `request_samples` (7 ngày), `error_events`/`client_events`/`job_runs` (30 ngày), `user_events` (90 ngày); không lưu nội dung bài/điểm/nhận xét; lỗi DB chỉ giữ mã lỗi. Beacon trình duyệt `/api/telemetry` không cần đăng nhập, có rate limit, thay UUID trong đường dẫn bằng `[id]`. Loại: session replay (trẻ vị thành niên), Google Analytics (dữ liệu ra bên thứ ba).

**2026-10-12 · Step-up admin 15 phút và Postgres role `classroom_app`** — Đã làm. Thao tác nhạy cảm của admin cần đăng nhập/nhập lại mật khẩu trong 15 phút (`sessions.reauth_at`). Trigger chặn INSERT ADMIN khi `current_user = 'classroom_app'` kể cả khi tự bật cờ (migration 0009) — chống SQL injection tạo admin. Áp dụng role là việc vận hành (scripts/sql/app-role.sql).

**2026-10-12 · Email khi chưa có tên miền: Gmail SMTP tạm thời** — Ghi nhận. `classroom-edu.vercel.app`/`*.workers.dev` không dùng được với Resend (không sửa DNS được). Code không đổi (SMTP); khi có tên miền thì chuyển sang Resend theo ADR trên.

**2026-10-12 · Keepalive DB do admin cấu hình** — Đã làm (người dùng yêu cầu). Bảng `app_settings` (key `keepalive`: bật/tắt, chu kỳ 1–144 giờ, lần ping cuối). Ping chạy trong `/api/cron`, `/api/keepalive` (CRON_SECRET) và scheduler Docker; lần gọi chưa tới hạn thì bỏ qua. App không tự thức được nên vẫn cần lịch gọi ngoài (Vercel Cron hằng ngày / Cloudflare Workers Cron); `/admin/settings` cảnh báo khi quá 2 chu kỳ chưa ping. Loại: ping từ trình duyệt admin (chỉ chạy khi admin mở trang).

**2026-10-12 · Email nhắc việc gộp 1 email/ngày/người + hạn mức theo ngày** — Đã làm. `users.last_reminder_email_at`, bảng `email_sends (day, kind, count)`, `EMAIL_DAILY_LIMIT` (mặc định 100) và `EMAIL_REMINDER_SHARE` (0.7) để luôn còn suất cho email giao dịch. Gửi lỗi thì giãn cách (`email_next_at`), quá 5 lần thì bỏ; hết suất thì để hôm sau, không tính là lỗi.

**2026-10-12 · Rate limit lưu ở Postgres; IP lấy qua `clientIp()`** — Đã làm (thay Map trong bộ nhớ). UPSERT nguyên tử trên bảng `rate_limits`, đúng khi chạy nhiều instance. IP: `CLIENT_IP_HEADER` nếu đặt, `x-real-ip` trên Vercel, còn lại phần tử đầu `x-forwarded-for`. Loại: Redis/Upstash (thêm dịch vụ, chưa cần ở quy mô một trường).

**2026-10-12 · Chặn tạo tài khoản trái phép và leo quyền (H0.5)** — Đã làm (người dùng yêu cầu).
- Một cửa tạo tài khoản `src/server/auth/accounts.ts`, không hàm nào nhận `role`; unit test fail nếu có `insert(users)` ở chỗ khác.
- Trigger `users_guard` (drizzle/0005): role không đổi được; INSERT ADMIN cần `SET LOCAL app.allow_admin_insert='on'`; đặt `approved_at` cần `app.allow_teacher_approval='on'`. Không có code app nào bật cờ admin; admin chỉ tạo bằng `pnpm admin:create` hoặc bootstrap.
- Duyệt GV theo tên miền chỉ sau khi xác minh email thật (bỏ qua khi tắt xác minh).
- GV không tự thêm HS đã có tài khoản: gửi lời mời (`class_invites`), HS tự đồng ý. GV chỉ cấp lại mật khẩu / sửa tên HS khi mọi lớp HS đang học đều do GV đó dạy; HS nhận thông báo khi bị cấp lại mật khẩu. Khác plan: không bắt buộc `created_by = GV` (HS tự vào lớp bằng mã vẫn được GV của mình cấp lại), vì lời mời có đồng ý đã chặn đường chiếm tài khoản.
- Admin không cấp lại mật khẩu cho admin khác; không khóa được admin hoạt động cuối cùng. GV chờ duyệt bị `requireActor()` chặn ở mọi nơi trừ trang cho phép rõ (`allowPending`).
- Chưa làm: hỏi lại mật khẩu cho thao tác nhạy cảm của admin (step-up) và tách Postgres role riêng cho app (ghi trong audit mục 12.3-F, việc của người vận hành).

**2026-10-12 · Bỏ seed dữ liệu demo khi deploy** — Đã làm. Xóa `scripts/seed-demo.ts` khỏi `vercel-build` (thay quyết định 2026-09-29 "Tài khoản dùng thử seed khi deploy"): sau khi xóa dữ liệu bàn giao, deploy không sinh lại `demo.gv`. Dữ liệu mẫu bàn giao tạo bằng `pnpm db:handover`.

**2026-10-12 · Email production: Resend qua SMTP (gói free), dự phòng Brevo** — Đã chốt (người dùng).
Lý do: code đã gửi bằng nodemailer qua SMTP nên chỉ cần đặt biến `SMTP_*` (`smtp.resend.com:465`, user `resend`, pass = API key), không sửa code. Gói free 3.000 email/tháng, tối đa 100/ngày, 1 tên miền, không chèn logo, không tự tính tiền khi vượt (chỉ tạm dừng gửi). Cần tên miền riêng của khách với SPF/DKIM (và DMARC) trên Cloudflare DNS; không gửi được từ `*.vercel.app`.
Hệ quả: email giao dịch (xác minh, đặt lại mật khẩu, báo admin) phải được ưu tiên trong giới hạn 100/ngày. Email nhắc HS gộp thành tối đa 1 email/ngày/HS và có `EMAIL_DAILY_LIMIT` (plan H1). Nhắc HS chủ yếu bằng in-app + Web Push. Vượt giới hạn thì đổi biến sang Brevo (free 300/ngày), Resend Pro hoặc Amazon SES.
Loại: SendGrid (bỏ gói free từ 05/2025, chỉ còn dùng thử 60 ngày); Gmail SMTP (địa chỉ @gmail.com, dễ bị khóa, chỉ dùng để test); Amazon SES (rẻ nhưng cài phức tạp, phải xin ra khỏi sandbox).

**2026-10-12 · Storage production: Cloudflare R2** — Đã chốt (người dùng). Đóng câu hỏi "R2 hay Cloudinary" trong PROJECT.md và mục 2026-09-28 bên dưới.
Lý do: app đã dùng `StorageProvider` theo chuẩn S3 (presigned PUT/GET, magic bytes, bucket private) nên R2 chỉ cần đặt biến `S3_*` (`S3_REGION=auto`, `S3_FORCE_PATH_STYLE=true` để origin của presigned URL khớp CSP, xem LESSONS 2026-10-12). Free 10GB, 1 triệu lượt ghi, 10 triệu lượt đọc mỗi tháng; **tải ra miễn phí** nên GV mở xem ảnh bài nộp không phát sinh phí; dùng chung tài khoản Cloudflare với Workers Cron và Turnstile. Bucket private, không bật `r2.dev`; CORS cho phép PUT/GET từ `APP_URL` với header `Content-Type`.
Loại: Cloudinary (phải viết lại luồng upload; gói free giới hạn khoảng 10MB/file trong khi app cho 25/50MB; chặn tải PDF/ZIP mặc định; credit hết nhanh). Amazon S3 (tương thích nhưng tính phí tải ra sau 100GB/tháng; chỉ chọn khi khách đã dùng AWS).

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

**2026-09-28 · Storage qua interface `StorageProvider` (S3 API); dev MinIO, prod R2** — Đã chốt R2 ngày 2026-10-12 (xem mục trên cùng).
Lý do: R2 free 10GB, không phí egress, bucket private, đổi nhà cung cấp dễ. Cloudinary free giới hạn 10MB/file, chặn PDF mặc định.

**2026-09-28 · Tài khoản học sinh: username bắt buộc, email tùy chọn; mật khẩu tạm + bắt buộc đổi lần đầu** — Đã chốt.
Lý do: nhiều HS phổ thông không có email riêng.

**2026-09-28 · Better Auth, session lưu DB (không JWT)** — Đã chốt. Lý do: thu hồi phiên được, dữ liệu HS không ra bên thứ ba.

**2026-09-28 · `is_late` là cờ, không phải trạng thái; lịch sử chấm append-only** — Đã chốt.

## 2026-09-29 — Chuyển deploy từ Render sang Vercel
Người dùng muốn cả app trên Vercel. Serverless không có process sống lâu nên: job chạy qua `/api/cron` (bảo vệ bằng `CRON_SECRET`; Hobby chỉ 1 lần/ngày, cron ngoài gọi thêm), bài lên lịch được đăng "lười" bằng `after()` trong layout GV/HS, migration chạy trong `vercel-build`. ClamAV tắt. Dockerfile giữ lại cho Render/VPS.

## 2026-09-29 — Tắt xác minh email GV (giữ code, bật bằng env)
Chưa có SMTP thật trên Vercel nên GV đăng ký xong không nhận được mail và không đăng nhập được. Mặc định `REQUIRE_EMAIL_VERIFICATION` khác `"true"`: đăng ký tạo tài khoản với `emailVerifiedAt = now`, tạo phiên và vào thẳng `/teacher`; đăng nhập không chặn GV chưa xác minh. Trang `/verify-email` và luồng gửi token vẫn giữ. Khi có SMTP: đặt `REQUIRE_EMAIL_VERIFICATION="true"` trên Vercel.

## 2026-09-29 — Landing/auth chạy đủ hiệu ứng, bỏ qua "giảm chuyển động"
Người dùng muốn landing trông giống nhau trên mọi máy (laptop của họ tắt Animation effects của Windows nên trình duyệt báo `prefers-reduced-motion: reduce`). Landing/auth không còn nhánh riêng cho reduce: hero trượt vào, reveal trượt, thẻ bồng bềnh, parallax, đường hành trình, thanh tiến độ cuộn, marquee đều chạy. Phần app (không có `.landing`) vẫn tắt hẳn hiệu ứng khi reduce. Thay cho mục "chỉ mờ dần" ở LESSONS 2026-09-29.

## 2026-09-29 — Một bảng màu chung (cam đất + kem) cho landing, auth và app
Người dùng muốn app GV/HS đồng bộ với landing. Bỏ bảng xanh dương/hổ phách cũ; giá trị của `.landing` chuyển lên `:root`/`.dark`, xóa khối ghi đè `.landing`. Primary `#B93C0B` (không dùng `#C2410C` vì chỉ đạt 4.44:1 trên `--surface-2`). Warning đổi sang vàng đậm `#8A5A00` để không trùng màu cam chủ đạo.

## 2026-09-29 — Tài khoản dùng thử seed khi deploy
`scripts/seed-demo.ts` chạy trong `vercel-build` sau migration: tạo `demo.gv` + `demo.hs` và dữ liệu mẫu nếu chưa có `demo.gv`, không xóa gì, lỗi thì chỉ ghi log (không chặn deploy). Repo công khai nên chỉ commit hash argon2; mật khẩu nằm trong `demo-accounts.local.md` (gitignore `*.local.md`). Tắt bằng `SEED_DEMO="false"`. Dữ liệu tính theo ngày seed nên sẽ cũ dần.

## 2026-09-29 — Hướng dẫn lần đầu lưu ở DB, xuất Excel làm trên trình duyệt
Cột `users.tour_completed_at` (migration 0002) để tour không hiện lại trên thiết bị khác; xem lại bằng `?tour=1` (link ở Tài khoản & bảo mật). File Excel tài khoản HS tạo ở client bằng `write-excel-file` (đọc bằng `read-excel-file`), nạp động khi bấm nút; mật khẩu tạm không lưu ở server, chỉ có ở phản hồi tạo/cấp lại. Cấp lại mật khẩu hàng loạt: mọi id phải là HS đang ở lớp, có id lạ thì 404 và không đổi gì.

## 2026-09-29 — GV tự đăng ký phải chờ admin duyệt
Tắt xác minh email khiến ai cũng tạo được tài khoản GV (kể cả học sinh). Người dùng chọn "chờ admin duyệt". Cột `users.approved_at` (migration 0003, tài khoản cũ được backfill = created_at): GV tự đăng ký có `approved_at = null` → `requireActor("TEACHER")` chuyển sang `/pending-approval`, nên mọi trang và server action GV đều bị chặn ở một chỗ. Admin duyệt/từ chối ở `/admin` (từ chối = DISABLED); duyệt xong GV nhận thông báo trong app. Email đúng tên miền trong `TEACHER_AUTO_APPROVE_DOMAINS` được duyệt ngay (chỉ khớp nguyên tên miền, không khớp tên miền con). Admin tạo GV, seed và demo đều đã duyệt sẵn. Cần ít nhất một admin trên production (BOOTSTRAP_ADMIN_* trong migrate.mjs).
