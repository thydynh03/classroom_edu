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
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push. Tạo bằng `npx web-push generate-vapid-keys`; `VAPID_SUBJECT=mailto:<email admin>`. Để trống thì tắt push |
| `ADMIN_NOTIFY_EMAILS` | Email nhận báo khi GV gửi yêu cầu mở khóa (ngoài email của các admin) |
| `OBS_SAMPLE_RATE` | Tỉ lệ lấy mẫu thời gian request cho /admin/ops (mặc định 1 = mọi request). Giảm (vd 0.2) khi lượng truy cập lớn |

> **Tên miền gửi mail:** Resend (và mọi dịch vụ email chuyên nghiệp) chỉ gửi từ tên miền bạn sở hữu và thêm được bản ghi DNS. `classroom-edu.vercel.app` và `*.workers.dev` **không dùng được**. Chưa có tên miền riêng thì tạm dùng Gmail SMTP: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=<gmail>`, `SMTP_PASS=<App Password>` (bật xác minh 2 bước trước), `EMAIL_FROM=<gmail>`, `EMAIL_DAILY_LIMIT=400`.

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

## 8. Tính năng nâng cao (bán theo từng giáo viên)

- Danh mục: `src/lib/premium-features.ts`. Đang bán: **Nhập đề Word/Excel**, **Sổ điểm + xuất Excel**, **Thống kê từng câu hỏi**. Các mục "Sắp ra mắt" chỉ ghi nhận quan tâm.
- GV vào **Nâng cao** → "Yêu cầu mở khóa" → admin nhận thông báo trong app + email (cần SMTP chạy) → admin liên hệ, nhận thanh toán → `/admin/upgrades` bấm **Mở khóa** (1/3/6/12 tháng hoặc vĩnh viễn; gia hạn cộng tiếp từ ngày hết hạn) → GV nhận thông báo.
- Giá và thông tin chuyển khoản hiển thị cho GV: `/admin/settings` → "Giá và thông tin thanh toán".
- Quyền được kiểm tra ở server; GV chưa mở khóa gọi thẳng action cũng bị từ chối.

## 9. Bảo mật tài khoản quản trị

- Thao tác nhạy cảm (khóa tài khoản, cấp mật khẩu tạm, tạo/duyệt GV, mở khóa/thu hồi tính năng) cần **nhập lại mật khẩu** nếu đăng nhập quá 15 phút (thanh vàng trên đầu trang admin).
- (Khuyến nghị) Cho app kết nối bằng Postgres role riêng `classroom_app` chỉ có quyền đọc/ghi: `psql "$DIRECT_URL" -v app_password="'<mật khẩu>'" -f scripts/sql/app-role.sql`, rồi đổi `DATABASE_URL` sang user này (giữ `DIRECT_URL` là user chủ cho migration). Role này không tắt được trigger và không tạo được admin kể cả khi bị SQL injection.

## 10. Theo dõi hệ thống và hành vi

- `/admin/ops`: p50/p95/p99, route chậm, lỗi server (đã ẩn dữ liệu người dùng), request không tới được server theo loại mạng, Web Vitals theo thiết bị, lịch sử job, email đã gửi/giới hạn, số thiết bị nhận push. Cảnh báo khi cron quá 26 giờ chưa chạy hoặc lỗi 5xx > 2%.
- `/admin/activity`: người dùng hoạt động ngày/tuần/tháng theo vai trò, phễu giao → làm → nộp → trả bài, thiết bị, giờ cao điểm, mức dùng tính năng, dòng thời gian một tài khoản (mỗi lần xem được ghi nhật ký).
- Lưu: mẫu request 7 ngày, lỗi/sự kiện trình duyệt/job 30 ngày, hành vi 90 ngày (tự xóa). Trang công khai `/privacy` mô tả đúng các mục này — nên nhờ pháp chế rà lại.
- Lỗi do hạ tầng (function timeout, 504 ở edge) chỉ thấy trong log Vercel.

## 11. Kiểm tra tải và checklist trước khi chạy thật

Load test (chạy trên bản build local hoặc staging, **không** chạy trên production):

```bash
pnpm build && pnpm start                    # cửa sổ 1
DATABASE_URL=... BASE_URL=http://localhost:3000 pnpm load:test --students 300 --spread 60   # cửa sổ 2
```

Kết quả ngày 12/10/2026 (một tiến trình Node, Postgres local, máy phát triển): 300 HS mở bài + nộp trong 60 giây → nộp bài p95 61 ms, 0 lỗi, 300/300 bài; dồn 300 bài trong 5 giây → nộp bài p95 439 ms, 0 lỗi, 300/300 bài. Trên Vercel + Supabase cần đo lại trên staging vì độ trễ mạng tới DB khác (nên đặt cùng vùng Singapore).

Checklist go-live:

- [ ] Merge vào `main`, deploy xanh, migration chạy xong (log build có `[migrate] xong`).
- [ ] Biến môi trường ở mục 2 đủ cho Production; `S3_FORCE_PATH_STYLE=true`.
- [ ] `pnpm db:handover` (mục 3) đã chạy; bucket R2 đã dọn; secret đã đổi; `BOOTSTRAP_ADMIN_PASSWORD` đã xóa.
- [ ] Cloudflare Worker gọi `/api/cron` mỗi 15 phút; `/admin/ops` → Job định kỳ có lần chạy "OK".
- [ ] Gửi thử email quên mật khẩu tới Gmail và Outlook (vào hộp thư chính).
- [ ] Trên iPhone: thêm vào màn hình chính → bật thông báo → "Gửi thử" nhận được. Android/Chrome: bật thông báo nhận được.
- [ ] HS nộp ảnh chụp từ điện thoại; GV mở xem được (kiểm tra cả ảnh iPhone).
- [ ] GV gửi yêu cầu mở khóa → admin nhận email → mở khóa → GV dùng được Nhập đề / Sổ điểm / Thống kê.
- [ ] `/privacy` đã được duyệt nội dung; Vercel đã lên gói Pro nếu thu tiền.

## 12. Vận hành hằng ngày

- **Duyệt giáo viên** tự đăng ký: `/admin` → "Giáo viên chờ duyệt".
- **HS quên mật khẩu**: GV của lớp bấm "Cấp lại mật khẩu" (chỉ được khi mọi lớp em đó học đều do GV này dạy); trường hợp khác admin cấp lại ở `/admin`. Admin không cấp lại mật khẩu cho admin khác: dùng Quên mật khẩu hoặc `pnpm admin:create`.
- **Thêm HS đã có tài khoản vào lớp**: GV gửi lời mời, HS bấm Đồng ý ở mục Lớp học.
- **Email**: xem log gửi ở dashboard Resend. Mỗi HS nhận tối đa 1 email nhắc/ngày; hết hạn mức ngày thì gửi tiếp hôm sau.
- **Lỗi**: Vercel → Project → Logs. Nhật ký thao tác quản trị: `/admin/audit`.
- **Backup**: Supabase gói trả phí có backup tự động; gói free thì `pg_dump` định kỳ.
