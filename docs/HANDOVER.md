# Bàn giao & vận hành — classroom_edu

Tài liệu cho người vận hành (chủ dự án / bộ phận IT của khách). Lý do kỹ thuật: `docs/memory/DECISIONS.md`. Audit & plan: `docs/audit/2026-10-12-handover-audit.md`.

## 1. Tài khoản dịch vụ (nên đứng tên khách)

| Dịch vụ | Dùng để | Gói |
| --- | --- | --- |
| Vercel | Chạy web + server | **Pro** khi dùng thương mại (Hobby chỉ cho dùng cá nhân, phi thương mại) |
| Supabase | Postgres | Free dùng được nếu bật "Giữ database luôn hoạt động" (mục 6); production nên dùng gói trả phí + backup |
| Cloudflare | R2 (lưu file), Workers Cron (gọi job định kỳ), DNS | Free |
| Resend | Gửi email (SMTP) | Free 3.000/tháng, tối đa 100/ngày |
| Tên miền | URL app + địa chỉ gửi mail | — |

## 2. Biến môi trường trên Vercel

Đặt ở Project → Settings → Environment Variables. **Không commit secret.** Production và Preview (staging, mục 7) dùng giá trị khác nhau.

| Biến | Giá trị / ghi chú |
| --- | --- |
| `DATABASE_URL` | Supabase pooler transaction (`:6543`, thêm `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase pooler session (`:5432`), dùng cho migration lúc build |
| `APP_URL` | `https://<tên miền app>` |
| `CRON_SECRET` | Chuỗi ngẫu nhiên ≥ 32 ký tự (`openssl rand -hex 32`) |
| `BOOTSTRAP_ADMIN_USERNAME` / `BOOTSTRAP_ADMIN_PASSWORD` | Chỉ để tạo admin đầu tiên (mật khẩu ≥ 12 ký tự). **Xóa mật khẩu ngay sau lần deploy đầu.** |
| `S3_ENDPOINT` | `https://<account_id>.r2.cloudflarestorage.com` |
| `S3_REGION` | `auto` |
| `S3_BUCKET` | vd `classroom-edu-prod` |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Token R2 quyền Object Read & Write, chỉ cho bucket này |
| `S3_FORCE_PATH_STYLE` | `true` (bắt buộc, nếu không CSP chặn upload — xem LESSONS) |
| `SMTP_HOST` | `smtp.resend.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `resend` |
| `SMTP_PASS` | **API key Resend** (`re_…`) |
| `EMAIL_FROM` | `Classroom Edu <no-reply@mail.<tên miền>>` (tên miền đã xác minh trên Resend) |
| `EMAIL_DAILY_LIMIT` | `100` (Resend free). Đổi khi nâng gói |
| `EMAIL_REMINDER_SHARE` | `0.7`: 70 email/ngày cho nhắc việc, phần còn lại để dành cho email quên mật khẩu, xác minh, báo admin |
| `REQUIRE_EMAIL_VERIFICATION` | `true` sau khi đã gửi thử email thành công |
| `TEACHER_AUTO_APPROVE_DOMAINS` | Tên miền email trường (vd `truong.edu.vn`): GV có email này được duyệt **sau khi bấm link xác minh**. Bỏ qua nếu chưa bật xác minh email |
| `CLIENT_IP_HEADER` | Để trống trên Vercel. Chỉ đặt khi chạy sau proxy khác (vd `cf-connecting-ip`) |

> API key Resend đã từng được dán vào chat khi phát triển: khi bàn giao, tạo key mới trên Resend, đặt vào `SMTP_PASS`, rồi xóa key cũ.

Cài R2 và Resend chi tiết (CORS, DNS SPF/DKIM/DMARC, cách thử): audit mục 13.1 và 13.2.

## 3. Lần đầu bàn giao: xóa dữ liệu thử, giữ admin, tạo dữ liệu mẫu

1. Backup: `pg_dump "$DIRECT_URL" > backup-truoc-ban-giao.sql` (lưu ngoài repo).
2. Chạy trên máy có `DIRECT_URL` của production:
   ```bash
   CONFIRM_WIPE=<host trong DIRECT_URL> DIRECT_URL="postgresql://..." pnpm db:handover --keep-admin <username admin>
   ```
   - Xóa toàn bộ dữ liệu, giữ nguyên admin đã chọn (mật khẩu không đổi).
   - Tạo `giaovien.mau` (có "Lớp mẫu", 1 bài tự luận, 1 bài trắc nghiệm 3 câu) và `hocsinh.mau`. Mật khẩu tạm in ra **một lần**, bắt đổi khi đăng nhập.
   - Không có admin để giữ: bỏ `--keep-admin`, thêm `--admin-username <tên> --admin-name "Họ tên"`. Không muốn dữ liệu mẫu: thêm `--no-sample`.
3. Xóa file cũ trong bucket R2: Cloudflare → R2 → bucket → xóa thư mục `att/` và `sub/` (hoặc tạo bucket mới và đổi `S3_BUCKET`).
4. Đổi secret: mật khẩu DB Supabase, key R2, `CRON_SECRET`, API key Resend. Xóa `BOOTSTRAP_ADMIN_PASSWORD`.

## 4. Tạo thêm quản trị viên

Không có cách tạo admin trên web (chủ ý, để không ai leo quyền được). Chạy trên máy vận hành:

```bash
DIRECT_URL="postgresql://..." pnpm admin:create --username ten.admin --name "Họ Tên" --email a@truong.edu.vn
```

Script hỏi xác nhận (gõ đúng host DB), in mật khẩu tạm một lần, ghi nhật ký và gửi email báo các admin hiện có. Database có trigger chặn mọi đường tạo admin khác.

## 5. Job định kỳ (nhắc hạn, đăng bài hẹn giờ, email, dọn dẹp, giữ DB hoạt động)

Vercel Cron (gói Hobby) chỉ gọi `/api/cron` **1 lần/ngày**. Để nhắc hạn đúng giờ, dùng Cloudflare Workers Cron gọi mỗi 15 phút:

1. Cloudflare → Workers & Pages → Create → Worker. Dán code:
   ```js
   export default {
     async scheduled(event, env, ctx) {
       const res = await fetch(`${env.APP_URL}/api/cron`, { headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });
       if (!res.ok) throw new Error(`cron ${res.status}`);
     },
   };
   ```
2. Settings → Variables: `APP_URL` (vd `https://lop.truong.edu.vn`) và secret `CRON_SECRET` (giống trên Vercel).
3. Settings → Triggers → Cron Triggers: `*/15 * * * *`.
4. Kiểm tra: tab Logs của Worker không có lỗi; trang `/admin/settings` hiện "Lần ping cuối" gần đây.

## 6. Giữ database luôn hoạt động (Supabase free)

Supabase gói free tạm dừng database khi lâu không có hoạt động (khoảng 7 ngày). Admin vào **/admin/settings → Giữ database luôn hoạt động**:

- Bật/tắt, chọn chu kỳ (1–144 giờ, mặc định 24). Có nút **Ping ngay** và hiện lần ping cuối.
- App không tự thức dậy được: ping chỉ chạy khi có lịch gọi `/api/cron` (mục 5, hoặc Vercel Cron hằng ngày) hoặc `/api/keepalive`. Trang cài đặt cảnh báo nếu đã quá 2 chu kỳ mà chưa có lần ping nào.
- `/api/keepalive` nhẹ hơn `/api/cron` (chỉ ping khi tới hạn), dùng được cho cron-job.org hoặc cho môi trường staging (mục 7). Cả hai cần header `Authorization: Bearer <CRON_SECRET>`.
- Gói Supabase trả phí không tạm dừng: tắt mục này cũng được.

## 7. Môi trường thử (staging) — không thử trên production

Production chỉ có một web, nên **đừng thử tính năng mới bằng dữ liệu thật của trường**. Có hai cách:

**A. Chạy trên máy (cho lập trình viên)** — `pnpm db:up && pnpm db:reset && pnpm dev` (README). Có sẵn Postgres, S3 (SeaweedFS), Mailpit để xem email, tài khoản mẫu `co.ha`, `tranminhkhoa`, `admin`.

**B. Bản staging trên Vercel (cho người dùng thử giao diện trên điện thoại)**
1. Tạo thêm một project Supabase riêng, vd `classroom-edu-staging` (gói free cho phép 2 project).
2. Tạo bucket R2 riêng `classroom-edu-staging` (hoặc dùng prefix khác).
3. Trên Vercel, đặt các biến ở mục 2 cho môi trường **Preview** trỏ vào DB/bucket staging (Production giữ nguyên).
4. Tạo branch `staging` trên GitHub. Mỗi lần push, Vercel build bản Preview với URL cố định dạng `<project>-git-staging-<team>.vercel.app` (branch `feat/*` đang tắt preview trong `vercel.json`).
5. Tạo dữ liệu thử cho staging: `CONFIRM_WIPE=<host staging> DIRECT_URL=<staging> pnpm db:handover --admin-username admin.staging`.
6. Giữ DB staging không bị tạm dừng: thêm một Cron Trigger thứ hai trong Worker (mục 5) gọi `/api/keepalive` của URL staging mỗi giờ. Nếu bản Preview bật Deployment Protection, tạo "Protection Bypass for Automation" trên Vercel và gửi kèm header `x-vercel-protection-bypass`.

Quy trình: code → push `staging` → thử trên URL staging (cả điện thoại) → merge vào `main` → production tự deploy.

## 8. Vận hành hằng ngày

- **Duyệt giáo viên** tự đăng ký: `/admin` → "Giáo viên chờ duyệt".
- **HS quên mật khẩu**: GV của lớp bấm "Cấp lại mật khẩu" (chỉ được khi mọi lớp em đó học đều do GV này dạy); trường hợp khác admin cấp lại ở `/admin`. Admin không cấp lại mật khẩu cho admin khác: dùng Quên mật khẩu hoặc `pnpm admin:create`.
- **Thêm HS đã có tài khoản vào lớp**: GV gửi lời mời, HS bấm Đồng ý ở mục Lớp học.
- **Email**: xem log gửi ở dashboard Resend. Mỗi HS nhận tối đa 1 email nhắc/ngày; hết hạn mức ngày thì gửi tiếp hôm sau.
- **Lỗi**: Vercel → Project → Logs. Nhật ký thao tác quản trị: `/admin/audit`.
- **Backup**: Supabase gói trả phí có backup tự động; gói free thì `pg_dump` định kỳ.
