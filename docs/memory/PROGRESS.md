# PROGRESS — roadmap MVP

Cập nhật sau mỗi task. `[x]` xong · `[~]` đang làm / dở · `[ ]` chưa làm.

## M0 · Foundation

- [x] Scaffold Next.js + TypeScript strict + pnpm, cấu trúc `src/` theo ARCHITECTURE.md
- [x] ESLint + Prettier, script `lint`, `typecheck`, `test`, `test:e2e`, `db:*`
- [x] Tailwind v4 + token light (D) / dark (E) trong `globals.css`, next-themes, font Plus Jakarta Sans + IBM Plex Mono (subset vietnamese)
- [x] shadcn/ui base: Button, Input, Label, Textarea, Select, Dialog, AlertDialog, DropdownMenu, Tabs, Badge, Avatar, Tooltip, Skeleton, Sheet, sonner
- [x] Layout shell: AppRail + TopBar (GV), MobileTabBar (HS), trang `/dev/ui` hiển thị token + component ở cả 2 theme
- [x] docker-compose: Postgres 16, MinIO, Mailpit; `.env.example`; env schema Zod
- [x] Vitest cấu hình + test unit chạy được với jsdom cho component (Playwright cấu hình ở task sau)
- [x] GitHub Actions CI: lint → typecheck → test

## M1 · Data & Auth

- [x] Drizzle schema toàn bộ bảng MVP + migration + seed (`pnpm db:reset`)
- [x] Auth tự viết: email/username + mật khẩu, đăng ký GV, verify email, quên/đặt lại mật khẩu, mật khẩu tạm bắt đổi, thiết bị đăng nhập + thu hồi, khóa sau 10 lần sai
- [x] `getActor()` + `requireActor()` + policy layer + integration test phân quyền

## M2 · Lớp học

- [x] CRUD lớp, màu lớp, lưu trữ · mã tham gia + link `/join/[code]` (HS tự tạo tài khoản) · thêm/xóa HS · tạo HS hàng loạt + cấp lại mật khẩu

## M3 · Bài tập & file

- [x] Tạo/sửa/đăng/lưu trữ/xóa nháp, giao nhiều lớp · đề bài văn bản thuần · StorageProvider S3 + upload presigned + magic bytes + xóa EXIF
- [x] Lên lịch đăng (status SCHEDULED + publish_at, job mỗi phút, chống đăng trùng)

## M4 · Nộp bài (HS)

- [x] Trang Hôm nay · chi tiết bài · tự lưu nháp (+ lưu cục bộ khi mất mạng) · nộp/rút lại · trễ hạn · nộp lại sau khi trả

## M5 · Chấm bài (GV)

- [x] Hộp Cần chấm · màn chấm 3 cột · điểm nhanh · ngân hàng nhận xét · chế độ tập trung + phím tắt (J/K, Ctrl+Enter, S, /, F, Esc) · grade_events · trả từng bài / hàng loạt

## M6 · Quiz tự chấm

- [x] Soạn câu hỏi (1 đáp án, nhiều đáp án, Đúng/Sai) · làm bài · chấm server-side · show_results · test không lộ đáp án

## M7 · Dashboard & theo dõi

- [x] Bento dashboard GV · thống kê từng bài · heatmap lớp (tab Theo dõi) · trang Điểm của HS

## M8 · Thông báo

- [x] Thông báo in-app (chuông, đánh dấu đã đọc) · job 15 phút: sắp đến hạn / quá hạn · email SMTP + giờ yên tĩnh

## M9 · Hardening & deploy

- [x] E2E luồng chính (GV → HS → chấm → xem điểm) + axe · integration test phân quyền · CSP/headers · Dockerfile · CI 3 job
- [ ] Deploy thật lên Render + R2 (cần tài khoản và secret của người dùng)
- [x] Trang quản trị `/admin`: người dùng (tìm, lọc, khóa/mở, gỡ khóa tạm, cấp mật khẩu tạm), tạo giáo viên, nhật ký

## Bàn giao (plan: docs/audit/2026-10-12-handover-audit.md)

- [x] H0 (phần code): `pnpm db:handover` (xóa dữ liệu, giữ admin, tạo GV/HS/lớp/bài mẫu), bỏ seed-demo khỏi build, `docs/HANDOVER.md`, `.env.example`
- [ ] H0 (phần vận hành, người dùng làm): backup + chạy `db:handover` trên production, xóa bucket R2, cài R2 + Resend + Cloudflare Workers Cron, đặt biến Vercel, đổi secret (kể cả API key Resend đã dán vào chat), Vercel Pro
- [x] H0.5 chặn tạo tài khoản trái phép & leo quyền (trigger DB, một cửa, `admin:create`, lời mời HS, giới hạn cấp lại mật khẩu) — còn: step-up re-auth cho admin, Postgres role riêng cho app
- [x] H1 lỗi đồng thời, rate limit Postgres, email gộp + hạn mức, tự lưu, thống kê, sửa tên HS, dọn dẹp
- [x] Admin: keepalive DB chỉnh được ở `/admin/settings`
- [x] H2 UX mobile: loading/error/404/global-error tiếng Việt, tab bar có nhãn + 44px, PWA, nhắc em chưa nộp, HEIC→JPEG, Tài liệu lớp, Lịch HS, Web Push
- [x] H3 /admin/ops (p50/p95/p99, lỗi, mất request, Web Vitals, job, email) · H4 /admin/activity + /privacy
- [x] H5 khung trả phí (yêu cầu mở khóa, email admin, mở khóa theo GV) · H6 nhập đề Word/Excel, sổ điểm + Excel, thống kê câu hỏi
- [x] H0.5 nâng cao: step-up admin 15 phút, role classroom_app (áp dụng trên production là việc vận hành)
- [x] H7 load test (`pnpm load:test`) + checklist go-live (HANDOVER mục 11)
- [ ] Vận hành: tên miền riêng (để gửi email Resend) hoặc Gmail SMTP tạm; VAPID keys; Cloudflare Worker cron; db:handover trên production

## Còn mở / Phase 2 ưu tiên

- Rubric, nhiều lượt làm quiz, co-teacher, xuất bảng điểm CSV.
- Rate limit dùng Redis khi chạy nhiều instance.

## Nhật ký

- 2026-09-28: Chốt thiết kế D + heatmap G + focus mode E + dark E. Tạo AGENTS/CLAUDE/GEMINI.md và docs. `git init`. Giao M0 cho agy.
- 2026-09-28: M0 hoàn tất (Claude tự viết CI + README, sửa label Select do axe báo; E2E 6/6 pass).
- 2026-09-28: Người dùng yêu cầu Claude tự code thay agy. Hoàn thành M1–M9 (trừ deploy thật). Verify: lint, typecheck, 55 unit, 20 integration, E2E 9/9 (1 skip mobile), build pass.
- 2026-09-28: Thêm admin, lên lịch đăng, CSP nonce (src/proxy.ts), quét virus ClamAV. Verify: 60 unit, 25 integration, E2E 9/9, build pass.
- 2026-09-29: Landing: hero hướng C (editorial + product UI, 2 thẻ nổi, hiện so le khi vào trang), footer 3 cột, luôn mở trang ở đầu, sửa responsive tablet (menu, hành trình 2×2), màn ≥1600px phóng theo tỉ lệ (html:has(.landing) font-size clamp, container max-w-7xl). agy review: ĐẸP. Đã push lên main.
- 2026-09-29: Animation: máy tắt "Animation effects" của Windows → prefers-reduced-motion: reduce → khối tắt hiệu ứng toàn cục làm landing hiện cứng. Đã giới hạn khối đó cho phần app; landing/auth ở chế độ giảm chuyển động chỉ mờ dần. UI chuyên nghiệp hơn theo plan của agy: nút phụ hero, bỏ khung viền lệch, thẻ lớp kiểu lớp học (dải màu + icon + thanh tiến độ theo màu lớp), quote đồng nhất, CTA cuối nền kem + lưới chấm, trục dọc hành trình trên mobile, auth dùng ảnh sáng + thẻ UI + chip, ô nhập nền sáng viền rõ. agy review: CHUYÊN NGHIỆP. Đã push lên main.
- 2026-09-29: Tắt xác minh email GV (chưa có SMTP): đăng ký xong vào thẳng /teacher; bật lại bằng REQUIRE_EMAIL_VERIFICATION="true" (xem DECISIONS). Landing: ảnh mục "Vì sao" đổi sang lesson.webp (lớp học châu Á, Unsplash) + mảng chấm, chip bo tròn, thẻ nhắc hạn; thẻ lớp có quầng màu, mã lớp, icon chìm, avatar, rê chuột viền/bóng theo màu lớp. Theme: mặc định sáng, bỏ "Theo hệ thống", một nút bấm đổi sáng/tối với vòng tròn lan từ nút (View Transitions), khóa lưu ce-theme. Đã push lên main.
- 2026-09-29: Dải môn học (marquee) chạy cả khi máy bật giảm chuyển động (60s thay vì 45s), rê chuột thì dừng. Đã push lên main.
- 2026-09-29: Landing/auth bỏ nhánh giảm chuyển động: mọi hiệu ứng chạy như nhau trên mọi máy (xem DECISIONS). Đã push lên main.
- 2026-09-29: App GV/HS dùng chung bảng màu cam đất + kem với landing (primary #B93C0B đạt AA). Dashboard GV/HS luôn hiện khung, ô không có số liệu có placeholder; GV chưa có lớp thấy 3 bước bắt đầu. Tài khoản dùng thử demo.gv / demo.hs seed khi deploy (scripts/seed-demo.ts, mật khẩu ở demo-accounts.local.md). Tab Học sinh: nhập họ tên từ Excel, tải file Excel mật khẩu tạm, xuất danh sách lớp, tìm kiếm, chọn nhiều em để cấp lại mật khẩu, trạng thái tài khoản. Hướng dẫn từng bước lần đầu đăng nhập cho GV/HS (làm tối xung quanh, Bỏ qua/Tiếp, phím Esc/←/→), lưu users.tour_completed_at, xem lại ở Tài khoản & bảo mật. Verify: lint, typecheck, 60 unit, 26 integration, E2E 9/9, build pass.
- 2026-09-29: Đã push 0c38c87 (màu, dashboard trống, Excel HS, tour); Vercel log: migrate xong, seed-demo tạo demo.gv/demo.hs trên production.
- 2026-10-12: Làm hết H2–H7 theo plan. Verify: lint, typecheck, 78 unit, 75 integration, E2E 17 pass/5 skip, next build pass; load test 300 HS: p95 nộp bài 61 ms (trải 60 s) / 439 ms (dồn 5 s), 0 lỗi.
- 2026-10-12: Code theo plan: H0.5, H1, H0 (code), keepalive admin, phần lớn H2. Verify: lint, typecheck, 67 unit, 54 integration (Postgres local qua INTEGRATION_DATABASE_URL), E2E 15 pass/3 skip (Chromium có sẵn), next build pass.
- 2026-10-12: Người dùng chốt R2 (storage) + Resend (email) → DECISIONS. Plan thêm H0.5 (chặn tạo tài khoản trái phép/leo quyền, mục 12) và mục 13 (checklist R2/Resend, giới hạn 100 email/ngày). Sửa README: R2 phải dùng `S3_FORCE_PATH_STYLE=true` (LESSONS).
- 2026-10-12: Audit bàn giao + plan H0–H7 ở `docs/audit/2026-10-12-handover-audit.md` (chưa sửa code, chưa xóa dữ liệu; chờ người dùng chốt mục 11). Verify: lint, typecheck, 62 unit pass; test:int không chạy được (container audit không có Docker daemon).
- 2026-09-29: GV tự đăng ký phải chờ admin duyệt (approved_at, /pending-approval, mục "Giáo viên chờ duyệt" ở /admin, TEACHER_AUTO_APPROVE_DOMAINS). Verify: lint, typecheck, 62 unit, 27 integration, E2E 10/10. Đã push lên main. Production cần có admin (BOOTSTRAP_ADMIN_*) để duyệt.
