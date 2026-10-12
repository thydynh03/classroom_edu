# Audit bàn giao & kế hoạch — classroom_edu

Ngày: 12/10/2026 · Người audit: Claude (orchestrator/reviewer) · Phạm vi: toàn bộ code trên `main` (commit `d69857b`).

> Đây là **bản audit + plan**, chưa sửa code và **chưa xóa dữ liệu nào**. Các mục ở phần 11 cần người dùng chốt trước khi làm.

---

## 0. Tóm tắt

**Kết luận:** đủ 8 chức năng ở mức MVP. Lint, typecheck và 62 unit test đều pass. Nhưng **chưa nên bàn giao ngay** vì còn 5 nhóm việc:

1. **Production thiếu cấu hình nên một phần chức năng không chạy.** Chưa có SMTP thì không có email. R2/S3 có thể chưa đặt (cần kiểm tra); nếu chưa thì học sinh **không nộp được ảnh hay file**. Cron trên Vercel Hobby chạy 1 lần/ngày trong khung 06:00–06:59 giờ VN, phần lớn khung này là giờ yên tĩnh (trước 06:30), nên **email nhắc hạn gửi thất thường, tối đa 50 email/ngày**, còn nhắc hạn có thể trễ tới 24 giờ.
2. **Lỗi đồng thời khi nhiều người dùng cùng lúc:** có 4 lỗi, đều nhỏ và sửa nhanh (xem mục 3).
3. **UX mobile:** không có trang loading, trang lỗi hay trang 404 tiếng Việt. App dùng 404 để chặn quyền, nên người dùng sẽ gặp trang 404 tiếng Anh mặc định của Next. Trên mạng 4G yếu, bấm vào không thấy phản hồi gì.
4. **Hạ tầng không hợp lệ hoặc không ổn định cho khách thương mại:** gói Vercel Hobby chỉ cho dùng cá nhân, phi thương mại. Supabase free tự tạm dừng khi không có hoạt động.
5. **Dữ liệu demo tự sinh lại sau mỗi lần deploy** (`vercel-build` chạy `seed-demo.ts`). Nếu chỉ xóa DB mà không tắt bước này, lần deploy sau sẽ tạo lại `demo.gv` và 22 học sinh demo.

Các yêu cầu mới (admin quản lý, theo dõi hành vi, dashboard p95/p99, tính năng trả phí kèm nút "Yêu cầu mở khóa") đều làm được trên kiến trúc hiện tại mà không phải đổi stack. Thiết kế ở mục 8–9, thứ tự làm ở mục 10.

---

## 1. Cách audit và giới hạn

| Đã làm                                                                                                     | Kết quả                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Đọc schema, policy, services, server actions, jobs, layout, trang HS/GV/admin, CI, Dockerfile, vercel.json | xong                                                                                                                                                                     |
| `pnpm lint`                                                                                                | ✅ pass                                                                                                                                                                  |
| `pnpm typecheck`                                                                                           | ✅ pass                                                                                                                                                                  |
| `pnpm test` (unit)                                                                                         | ✅ 62/62 pass                                                                                                                                                            |
| `pnpm test:int` (phân quyền, Testcontainers)                                                               | ⚠️ **không chạy được trong môi trường audit** (container không có Docker daemon). Lần chạy gần nhất ghi trong PROGRESS là 27 test pass. CI trên GitHub vẫn chạy job này. |
| `pnpm test:e2e`                                                                                            | ⚠️ không chạy (cần Postgres đã seed và Docker)                                                                                                                           |
| Kiểm tra production (Vercel/Supabase/R2)                                                                   | ❌ không có quyền truy cập. Các mục ghi "cần xác minh" phải kiểm tra trên dashboard Vercel.                                                                              |

---

## 2. Đối chiếu 8 chức năng yêu cầu

Ký hiệu: ✅ chạy đúng · ⚠️ chạy nhưng thiếu hoặc có lỗi · ❌ chưa có hoặc không chạy trên production.

| #   | Chức năng                             | Trạng thái                    | Đã có                                                                                                                                                                                                                                          | Thiếu / lỗi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Quản lý lớp học**                   | ✅                            | Tạo/sửa/lưu trữ lớp, màu lớp, mã 8 ký tự và link `/join/[code]`, bật/tắt tham gia bằng mã, tạo HS hàng loạt (dán tên hoặc Excel), thêm HS đã có tài khoản, xóa HS (giữ bài nộp), cấp lại mật khẩu từng em hoặc hàng loạt, xuất danh sách Excel | GV **không sửa được họ tên HS** (gõ sai phải tạo lại). Nếu tạo 100 HS mà lỗi giữa chừng thì các tài khoản đã tạo mất mật khẩu tạm (`classes.ts` `bulkCreateStudents` không chạy trong một transaction). Không có danh sách HS đã rời lớp để thêm lại. Chưa có chuyển lớp sang GV khác khi GV nghỉ.                                                                                                                                                                                                                                                  |
| 2   | **Đăng nhập**                         | ⚠️                            | Tài khoản riêng GV/HS/ADMIN. GV tự đăng ký rồi chờ admin duyệt. HS vào bằng mã lớp hoặc do GV tạo (username + mật khẩu tạm, bắt đổi lần đầu). Khóa sau 10 lần sai, thiết bị đăng nhập + thu hồi, argon2id, session lưu DB                      | **Quên mật khẩu qua email không chạy** khi chưa có SMTP (chỉ admin hoặc GV cấp lại được). Rate limit nằm trong bộ nhớ nên vô hiệu trên serverless. Bộ đếm sai mật khẩu không nguyên tử (mục 3).                                                                                                                                                                                                                                                                                                                                                     |
| 3   | **Giao bài tập**                      | ⚠️                            | Tự luận + trắc nghiệm, file đính kèm, hạn nộp, nhận/không nhận trễ, cho nộp lại, giao nhiều lớp một lần, nháp, hẹn giờ đăng, lưu trữ                                                                                                           | **Đính kèm tài liệu cần R2/S3** (cần xác minh biến `S3_*` trên Vercel). Đề bài chỉ là văn bản thuần: không in đậm, không công thức Toán, không chèn ảnh vào giữa đề. **Chưa có loại "Tài liệu" riêng** (đăng tài liệu cho lớp mà không cần nộp bài): yêu cầu ghi "đăng bài tập, tài liệu, đề bài", hiện tài liệu chỉ đi kèm bài tập. Tạo được bài có hạn nộp đã qua.                                                                                                                                                                                |
| 4   | **Nộp bài trực tuyến**                | ⚠️                            | Viết trực tiếp, đính kèm file/ảnh, nút chụp ảnh bằng camera, ảnh được thu nhỏ và xóa GPS, tự lưu nháp 2 giây, lưu cục bộ khi mất mạng, rút lại, đánh dấu trễ do server tính, nộp lại khi được trả                                              | **Cần R2/S3 trên production.** Lỗi tự lưu mất nội dung gõ trong lúc đang lưu (mục 3). Ảnh HEIC từ iPhone không được chuyển sang JPEG, GV dùng Chrome/Windows có thể không xem được (cần thử trên iPhone thật). Chưa gộp nhiều ảnh thành một PDF.                                                                                                                                                                                                                                                                                                    |
| 5   | **Chấm điểm**                         | ✅                            | Điểm + nhận xét, lưu nháp điểm, trả từng bài / trả hàng loạt, sửa điểm, lịch sử chấm append-only, ngân hàng nhận xét, chế độ tập trung + phím tắt, HS chỉ thấy điểm khi đã trả                                                                 | Trên điện thoại cột danh sách bị ẩn (`hidden lg:flex`), GV chấm trên điện thoại phải bấm qua lại từng bài. Chưa chấm/ghi chú trực tiếp lên ảnh bài làm, chưa có rubric.                                                                                                                                                                                                                                                                                                                                                                             |
| 6   | **Trắc nghiệm tự động**               | ⚠️                            | 1 đáp án, nhiều đáp án, Đúng/Sai. Chấm ở server. Hiện kết quả ngay / sau hạn / thủ công. Có test chứng minh không lộ `is_correct`                                                                                                              | **Không tự lưu câu trả lời**: HS tải lại trang, hết pin hay mất mạng giữa chừng là mất hết bài đang làm. Nộp hai lần song song có thể ghi đè nhau (mục 3). Chưa giới hạn thời gian, chưa trộn câu, mới 1 lượt làm. Câu nhiều đáp án tính đúng hết hoặc 0 điểm. GV chưa có thống kê từng câu.                                                                                                                                                                                                                                                        |
| 7   | **Quản lý bài tập (đã nộp/chưa nộp)** | ✅                            | Số liệu từng bài (tổng, đã nộp, chưa nộp, trễ, đã chấm), danh sách HS theo trạng thái, hộp "Cần chấm" xuyên lớp, heatmap HS × bài, dashboard GV, trang điểm của HS                                                                             | Bài nộp của HS **đã rời lớp** vẫn được tính vào "đã nộp", nên tỉ lệ có thể sai hoặc vượt sĩ số (`classes.ts:411`). Chưa có nút **"Nhắc các em chưa nộp"**. Chưa xuất bảng điểm.                                                                                                                                                                                                                                                                                                                                                                     |
| 8   | **Thông báo (nhắc lịch, deadline)**   | ❌ trên production · ✅ local | In-app: bài mới, sắp đến hạn (24 giờ), quá hạn, có bài nộp (gộp theo ngày), đã trả bài. Email có giờ yên tĩnh 21:30–6:30. Chuông thông báo, đánh dấu đã đọc                                                                                    | Trên Vercel Hobby, cron `0 23 * * *` UTC (06:00 giờ VN) chạy **1 lần/ngày**, Hobby chỉ đảm bảo chạy trong khung giờ đó, phần lớn khung là giờ yên tĩnh. Nếu chạy trước 06:30 thì `flushNotificationEmails` trả 0; chạy sau thì gửi được **tối đa 50 email/ngày**. Nhắc "sắp đến hạn" và "quá hạn" trễ tới 24 giờ. Đa số HS không có email nên chỉ thấy nhắc khi tự mở app. **Không có thông báo đẩy (Web Push)** và không có lịch. Hàng đợi email có thể kẹt (mục 3). Landing đang hứa "Nhắc 24 giờ trước hạn", điều này chưa đúng trên production. |

---

## 3. Khi nhiều người dùng cùng lúc

Bối cảnh: Vercel serverless (nhiều instance chạy song song, bộ nhớ không chia sẻ) với Supabase qua pooler. Với vài trăm HS thì kiến trúc **đủ sức**: upload đi thẳng lên storage, DB có index cho các truy vấn chính. Các lỗi bên dưới xuất hiện khi có **nhiều request trùng thời điểm**, ví dụ cả lớp nộp bài trong phút cuối trước hạn.

| Mức     | Vấn đề                                                                                                    | Chỗ                                     | Hậu quả                                                                                                                        | Cách sửa                                                                                                                    |
| ------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| 🔴 Cao  | Rate limit nằm trong `Map` bộ nhớ của từng instance                                                       | `src/server/rate-limit.ts:4`            | Trên Vercel mỗi instance đếm riêng, nên giới hạn đăng nhập/đăng ký/tham gia lớp gần như không có tác dụng                      | Chuyển sang đếm trong Postgres (bảng `rate_limits`, `INSERT … ON CONFLICT DO UPDATE` nguyên tử), hoặc dùng WAF của nền tảng |
| 🔴 Cao  | Cron 1 lần/ngày, phần lớn khung chạy là giờ yên tĩnh, mỗi lượt chỉ gửi 50 email                           | `vercel.json`, `notifications.ts:46–52` | Email gửi thất thường hoặc không gửi, nhắc hạn trễ tới 24 giờ                                                                  | Gọi `/api/cron` mỗi 10–15 phút bằng cron bên ngoài (Cloudflare Workers Cron hoặc cron-job.org), hoặc nâng Vercel Pro        |
| 🟠 Vừa  | Bộ đếm sai mật khẩu đọc rồi mới ghi (không nguyên tử)                                                     | `src/app/(auth)/actions.ts:77`          | Gửi song song nhiều lượt đoán mật khẩu sẽ vượt mốc khóa 10 lần                                                                 | `UPDATE users SET failed_logins = failed_logins + 1 … RETURNING` rồi mới quyết định khóa                                    |
| 🟠 Vừa  | Nộp quiz không có điều kiện trạng thái trong UPDATE                                                       | `submissions.ts:167–195`                | Bấm đúp hoặc mở 2 tab có thể nộp 2 lần, sinh 2 `grade_events`, lần sau ghi đè lần trước                                        | `UPDATE … WHERE id = ? AND status = 'DRAFT'`; không có dòng nào được cập nhật thì báo "Bài đã nộp"                          |
| 🟠 Vừa  | Tự lưu bài viết làm mất nội dung gõ trong lúc đang lưu                                                    | `written-panel.tsx:57–63`               | Lượt lưu đầu xong thì đặt `dirty=false`, nên phần gõ thêm trong lúc chờ không được gửi lên server (chỉ còn trong localStorage) | Dùng bộ đếm phiên bản thay cho cờ `dirty`, hoặc so nội dung đã gửi với nội dung hiện tại                                    |
| 🟠 Vừa  | Hàng đợi email: lấy 50 dòng không sắp xếp, dòng gửi lỗi giữ nguyên                                        | `notifications.ts:46–60`                | SMTP lỗi 50 lần là cả hàng đợi kẹt vĩnh viễn                                                                                   | Sắp xếp theo `created_at`, thêm `email_attempts` và `email_last_error`, thử lại có giãn cách, bỏ sau N lần                  |
| 🟡 Thấp | GV chấm đúng lúc HS rút bài: `saveGrade` không kiểm tra lại trạng thái trong UPDATE                       | `submissions.ts` `saveGrade`            | Hiếm gặp; có thể chấm vào bản nháp                                                                                             | Thêm điều kiện `status IN ('SUBMITTED','GRADED','RETURNED')` vào UPDATE                                                     |
| 🟡 Thấp | Thiếu index cho truy vấn gửi email (`email_sent_at IS NULL AND type IN …`) và cho `audit_logs.created_at` | `schema.ts`                             | Chậm dần khi bảng lớn                                                                                                          | Thêm partial index                                                                                                          |
| 🟡 Thấp | Không dọn file `PENDING`, phiên hết hạn, token đã dùng                                                    | —                                       | Bảng và bucket phình dần                                                                                                       | Thêm bước dọn vào `/api/cron`                                                                                               |
| 🟡 Thấp | Vercel đặt ở `bom1` (Mumbai), Supabase ở `ap-south-1`                                                     | `vercel.json`                           | Mỗi trang cần vài lượt truy vấn DB; người dùng VN gần Singapore hơn. `ARCHITECTURE.md` ghi `sin1`, không khớp với cấu hình     | Khi chuyển sang tài khoản của khách, cân nhắc đặt cả hai ở Singapore (`sin1` + `ap-southeast-1`)                            |

**Chưa từng load test.** Plan có một bước k6 giả lập 300 HS nộp bài cùng phút trước hạn (mục 10, H7).

---

## 4. Bảo mật & vận hành

Phần làm tốt: policy layer thống nhất, trả 404 khi không có quyền, actor luôn lấy từ session, Zod strict ở server action, CSP có nonce, cookie `__Host-`, argon2id, token reset chỉ lưu hash, quét magic bytes khi upload, không lộ đáp án quiz (có test).

Cần xử lý:

1. **IP lấy từ `x-forwarded-for`, phần tử đầu tiên** (`session.ts:34`, `actions.ts:42`, `account-actions.ts:62`). Trên Vercel thì đúng. Chạy Docker hoặc VPS không có proxy tin cậy thì giả mạo được, và sau Cloudflare phải đọc `CF-Connecting-IP`. Nên gom về một hàm `clientIp()` đọc theo nền tảng.
2. **ClamAV tắt trên Vercel.** File chỉ được kiểm tra magic bytes. Chấp nhận được, nhưng nên ghi rõ trong tài liệu bàn giao.
3. **Không có error tracking.** `SENTRY_DSN` có trong schema env nhưng không dùng. Lỗi production hiện chỉ xem được trong log Vercel. Mục 8 giải quyết việc này.
4. **Hạ tầng cho khách thương mại:**
   - Theo tài liệu của Vercel, gói **Hobby chỉ cho dùng cá nhân, phi thương mại**. Bán dịch vụ, thu tiền mở khóa, hay được trả tiền để làm site đều tính là thương mại, nên cần **Vercel Pro**. ([Vercel Hobby plan](https://vercel.com/docs/plans/hobby), [Fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines))
   - Supabase free giới hạn dung lượng và tạm dừng project khi không có hoạt động. Production của khách nên dùng gói trả phí, hoặc ít nhất có backup định kỳ.
   - Tài khoản Vercel, Supabase, R2, tên miền và SMTP nên đứng tên khách (hoặc chuyển quyền sở hữu khi bàn giao).
5. **Pháp lý (không phải tư vấn luật):** HS phần lớn chưa đủ 18 tuổi. Khi thêm theo dõi hành vi và thu tiền thì cần trang **Chính sách quyền riêng tư** và **Điều khoản sử dụng** (Nghị định 13/2023 về bảo vệ dữ liệu cá nhân), cùng quy trình hóa đơn. Nên hỏi kế toán hoặc luật sư của khách.

---

## 5. UI/UX & mobile cho học sinh

### Nên thêm (ưu tiên từ trên xuống)

| #   | Việc                                                                                                                                 | Lý do                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `loading.tsx` có skeleton cho `/student`, `/student/assignments/[id]`, `/student/classes`, `/student/grades`, `/teacher/*`, `/admin` | 4G yếu bấm vào không thấy gì, HS bấm lại nhiều lần. AGENTS.md yêu cầu mọi màn hình có skeleton nhưng hiện **không có file `loading.tsx` nào** |
| 2   | `not-found.tsx` (tiếng Việt, kiêm màn "không có quyền"), `error.tsx` cho từng khu vực, `global-error.tsx`                            | App dùng `notFound()` để chặn quyền nên hiện **trang 404 tiếng Anh mặc định**. Lỗi bất ngờ hiện "Application error" tiếng Anh                 |
| 3   | **Tự lưu câu trả lời quiz** (localStorage ngay khi chọn, kèm lưu nháp lên server)                                                    | HS làm trên điện thoại dễ mất bài                                                                                                             |
| 4   | Thanh tab mobile: **luôn hiện nhãn** dưới icon, vùng bấm ≥ 44px                                                                      | Hiện chỉ tab đang mở có nhãn (`mobile-tab-bar.tsx:124`), vùng bấm khoảng 36px                                                                 |
| 5   | **PWA**: `manifest.webmanifest`, icon, màu theme, "Thêm vào màn hình chính"                                                          | HS mở như một app. Đây cũng là bước chuẩn bị cho Web Push                                                                                     |
| 6   | **Web Push** nhắc hạn (sau PWA)                                                                                                      | Cách duy nhất nhắc được HS không có email. PROJECT.md xếp vào Phase 3, nhưng với yêu cầu "nhắc lịch, deadline" thì nên đưa lên sớm            |
| 7   | Trang **Lịch** (HS: danh sách hạn nộp theo ngày, 2 tuần tới)                                                                         | Yêu cầu có "nhắc lịch"; hiện chỉ có dải 7 ngày bị `aria-hidden`                                                                               |
| 8   | Nút **"Nhắc các em chưa nộp"** ở trang bài tập (GV)                                                                                  | Việc GV làm thường xuyên nhất, làm ít tốn công                                                                                                |
| 9   | Loại bài **"Tài liệu"** (không hạn nộp, không nộp bài) hoặc bảng tin lớp                                                             | Khớp yêu cầu "đăng tài liệu"                                                                                                                  |
| 10  | GV sửa họ tên HS; xem danh sách HS đã rời lớp và thêm lại                                                                            | Thao tác quản lý lớp cơ bản                                                                                                                   |
| 11  | Chuyển ảnh HEIC sang JPEG phía client, hoặc chặn HEIC kèm hướng dẫn                                                                  | GV mở ảnh từ iPhone được                                                                                                                      |
| 12  | Thêm test E2E project mobile (375px) cho luồng HS: mở bài, chụp/đính kèm, nộp, xem điểm                                              | Hiện test mobile đang bị skip                                                                                                                 |

### Nên bỏ hoặc sửa

- **Bỏ `tsx scripts/seed-demo.ts` khỏi `vercel-build`** (hoặc đặt `SEED_DEMO=false`). Script tự tạo lại `demo.gv` và 22 HS demo ở lần deploy kế tiếp nếu không còn `demo.gv`, tức là ngay sau khi xóa dữ liệu.
- Câu chữ landing phải khớp thực tế: "Nhắc 24 giờ trước hạn" và "nhận thông báo ngay" chỉ đúng khi cron chạy đều và có push/email.
- Bảng "Tài khoản mẫu" trong README là dữ liệu seed dev (`co.ha`…). Tài liệu bàn giao cho khách cần một bản riêng.
- Đồng bộ lại `ARCHITECTURE.md` (ghi region `sin1`, thực tế `bom1`).

---

## 6. Có nên thêm Cloudflare không?

**Có, nhưng không đặt proxy (đám mây cam) trước Vercel.** Vercel khuyến cáo không đặt reverse proxy phía trước: nó làm Vercel Firewall và chống bot hoạt động kém, tăng độ trễ, gây xung đột cache, và hay gặp lỗi 526/524. ([Vercel: Should I use Cloudflare in front of Vercel?](https://vercel.com/guides/cloudflare-with-vercel), [Reverse proxy & Vercel](https://blog.vercel.com/docs/security/reverse-proxy), [Community: lỗi khi bật proxy](https://community.vercel.com/t/how-to-fix-vercel-invalid-configuration-error-with-cloudflare-proxy-enabled/37446))

Nên dùng Cloudflare cho các việc sau:

| Dùng                                                                                                           | Lợi ích                                                                                                           |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **R2** (storage file bài nộp)                                                                                  | Đã nằm trong kiến trúc; free 10GB, không phí egress. Cần thiết để nộp ảnh/file chạy được                          |
| **Workers Cron Triggers** gọi `/api/cron` mỗi 10–15 phút kèm `Authorization: Bearer CRON_SECRET`               | Vượt giới hạn cron 1 lần/ngày, nhắc hạn đúng giờ và gửi được email                                                |
| **Turnstile** (captcha miễn phí, không làm phiền) trên đăng ký GV, `/join/[code]` và đăng nhập sau vài lần sai | Thay rate limit trong bộ nhớ đang vô hiệu, chặn bot tạo tài khoản. _Cần thêm `challenges.cloudflare.com` vào CSP_ |
| **DNS** của tên miền (chế độ DNS-only, đám mây xám)                                                            | Quản lý tên miền tập trung                                                                                        |

**Nếu sau này chuyển sang VPS hoặc Docker** (không dùng Vercel) thì bật proxy Cloudflare (WAF, rate limiting, chống DDoS). Khi đó phải: đọc IP từ `CF-Connecting-IP`; tắt Rocket Loader, Email Obfuscation và Auto Minify vì chúng chèn script làm vỡ CSP nonce; không cache trang HTML (trang nào cũng cá nhân hóa).

Trên Vercel, lớp chống tấn công nên dùng Vercel Firewall (custom rules, rate limit) theo gói khách mua.

---

## 7. Xóa dữ liệu, giữ 1 tài khoản mẫu, bàn giao

> Chưa thực hiện. Môi trường audit không có quyền truy cập DB production, nên việc xóa phải chạy bằng script trên máy có `DIRECT_URL` (hoặc tôi chạy nếu được cấp biến này).

### Đề xuất dữ liệu giữ lại (cần chốt, mục 11)

- **1 admin của khách**: bắt buộc, vì chỉ admin duyệt được GV tự đăng ký.
- **1 giáo viên mẫu** (`giaovien.mau`), có 1 lớp mẫu, 1 HS mẫu (`hocsinh.mau`), 1 bài tự luận và 1 bài trắc nghiệm, để khách thử ngay.
- Mật khẩu sinh ngẫu nhiên, chỉ in ra một lần khi chạy script, không commit. Tài khoản mẫu đặt `must_change_password = true`.

### Các bước

1. **Backup trước khi xóa:** `pg_dump` toàn bộ DB và lưu ngoài repo.
2. Viết `scripts/handover-reset.ts`:
   - Chỉ chạy khi có `CONFIRM_WIPE=<tên host DB>` (chống chạy nhầm DB).
   - Trong một transaction: `TRUNCATE` các bảng `audit_logs, notifications, grade_events, submission_files, submissions, question_options, questions, assignment_attachments, files, assignments, class_members, classes, auth_tokens, sessions, users` (cùng danh sách với `scripts/seed.ts`), rồi tạo các tài khoản ở trên.
   - Thêm script `pnpm db:handover`.
3. **Tắt seed demo:** bỏ `tsx scripts/seed-demo.ts` khỏi `vercel-build` (khuyến nghị xóa luôn file, kèm ADR), hoặc đặt `SEED_DEMO=false` trên Vercel.
4. **Xóa object trong bucket R2** (`att/`, `sub/`) hoặc tạo bucket mới.
5. **Đổi secret:** mật khẩu DB, key R2, `CRON_SECRET`. Xóa `BOOTSTRAP_ADMIN_PASSWORD` khỏi env sau khi admin đăng nhập. Xóa `demo-accounts.local.md` trên máy chủ dự án.
6. **Cấu hình production đầy đủ:** R2 theo checklist mục 13.1, Resend theo mục 13.2, `REQUIRE_EMAIL_VERIFICATION=true` sau khi gửi thử được email, `APP_URL` (tên miền thật). **Chưa đặt `TEACHER_AUTO_APPROVE_DOMAINS`** cho tới khi xong H0.5: hiện biến này duyệt GV mà không cần xác minh email (mục 12).
7. Viết `docs/HANDOVER.md` cho khách: đăng nhập admin, duyệt GV, tạo lớp, phát tài khoản HS, xử lý quên mật khẩu, nơi xem log, cách backup.

---

## 8. Phần admin: quản lý, theo dõi hành vi, dashboard p95/p99, lỗi, mất request

### 8.1 Admin quản lý (thêm vào trang admin hiện có)

| Trang                  | Nội dung                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/admin` (đã có)       | Người dùng, GV chờ duyệt, khóa/mở, cấp mật khẩu tạm. Thêm: lọc "chưa đăng nhập 30 ngày", xóa tài khoản theo yêu cầu (soft delete + audit)                    |
| `/admin/classes`       | Danh sách lớp (tên, GV, sĩ số, số bài, hoạt động gần nhất), **chuyển lớp sang GV khác**, lưu trữ. Không xem bài làm hay điểm (giữ nguyên quyết định privacy) |
| `/admin/upgrades`      | Yêu cầu mở khóa tính năng (mục 9)                                                                                                                            |
| `/admin/ops`           | Sức khỏe hệ thống (8.3)                                                                                                                                      |
| `/admin/activity`      | Hành vi người dùng (8.2)                                                                                                                                     |
| `/admin/settings`      | Tên trường, logo, email nhận thông báo admin, bật/tắt GV tự đăng ký, banner thông báo toàn hệ thống                                                          |
| `/admin/audit` (đã có) | Thêm lọc theo người, hành động, ngày                                                                                                                         |

### 8.2 Theo dõi hành vi người dùng

- Bảng `user_events (id, at, user_id, role, event, route, device, meta jsonb)`. Sự kiện **ghi ở server** tại các điểm nghiệp vụ: đăng nhập, mở bài, nộp, rút, chấm, trả, tạo lớp, tạo bài, upload, mở tính năng khóa, gửi yêu cầu mở khóa. Không ghi nội dung bài, điểm hay nhận xét (theo AGENTS.md).
- Dashboard: DAU/WAU/MAU theo vai trò; lượt đăng nhập theo ngày; **phễu** (bài được giao → HS mở → nộp → GV chấm → trả); tỉ lệ dùng điện thoại so với máy tính; heatmap giờ cao điểm (giờ × thứ); mức dùng từng tính năng; dòng thời gian hoạt động của một tài khoản (việc admin mở xem cũng ghi audit).
- Lưu 90 ngày rồi gộp theo ngày. Không dùng công cụ quay màn hình (session replay) vì người dùng là trẻ vị thành niên.

### 8.3 Sức khỏe hệ thống: p50/p95/p99, request lỗi, mất request

| Nguồn                                 | Cách lấy                                                                                                                                                                                                                                                                   | Hiển thị                                                                                                |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Lỗi server**                        | Export `onRequestError` trong `src/instrumentation.ts` (Next 16 hỗ trợ sẵn; có `routePath`, `routeType` render/route/action/proxy) → bảng `error_events` (route, loại, digest, message đã cắt, số lần, lần cuối). Không lưu body hay cookie                                | Bảng lỗi gom theo route + digest, xu hướng 24h/7 ngày                                                   |
| **Độ trễ server**                     | Span OpenTelemetry của Next (`@vercel/otel` + span processor tự viết ghi thời lượng request gốc: route, method, status) → `request_samples` (giữ 3 ngày) → mỗi giờ gộp vào `request_stats_hourly` kèm histogram bucket                                                     | p50/p95/p99 theo thời gian, top route chậm nhất, tỉ lệ 4xx/5xx                                          |
| **Mất request / lỗi phía người dùng** | Beacon client (`navigator.sendBeacon('/api/telemetry')`, gửi theo lô, có rate limit): server action hoặc fetch lỗi mạng, quá thời gian, nộp bài khi offline, tải trang bị hủy. Kèm Web Vitals (`useReportWebVitals`: TTFB, LCP, INP) và loại mạng (`navigator.connection`) | "Request không tới được server" theo route và theo mạng/thiết bị; Web Vitals của người dùng mobile thật |
| **Job nền**                           | `/api/cron` ghi `job_runs` (bắt đầu, kết thúc, số bài đăng, số nhắc, email gửi/lỗi)                                                                                                                                                                                        | Lần chạy cuối, cảnh báo nếu hơn 30 phút chưa chạy, độ dài hàng đợi email                                |

- Mất request do hạ tầng (function timeout, 504 ở edge) chỉ thấy trong log của nền tảng. Có thể bổ sung bằng Vercel Log Drains hoặc Observability (gói Pro), hoặc thêm Sentry (bản miễn phí) để xem stack trace.
- Cần ADR cho dependency mới (`@vercel/otel`, có thể thêm thư viện vẽ biểu đồ). Biểu đồ theo skill `dataviz`.
- Cảnh báo: gửi email cho admin khi tỉ lệ 5xx vượt 2% trong 10 phút hoặc cron 30 phút chưa chạy.

---

## 9. Tính năng trả phí và luồng "Yêu cầu mở khóa"

### 9.1 Luồng (đúng như yêu cầu: xem mô tả → bấm nút → gửi admin → email admin)

1. GV thấy mục **"✨ Nâng cao"** trên thanh điều hướng, cùng các nút có ổ khóa ngay chỗ dùng (ví dụ "Nhập đề từ Word ✨" trong trình soạn quiz).
2. Bấm vào: modal hoặc trang mô tả lợi ích, ảnh hoặc GIF demo, gói (tháng / năm / cả trường).
3. Nút **"Yêu cầu mở khóa"**: form ngắn (chọn gói, SĐT/Zalo tùy chọn, ghi chú) → server action:
   - Tạo `upgrade_requests (id, requester_id, feature_key, plan, contact, note, status NEW|CONTACTED|PAID|GRANTED|REJECTED, admin_note, handled_by, handled_at, created_at)`. Mỗi GV chỉ có một yêu cầu đang mở cho mỗi tính năng; có rate limit.
   - Báo admin trong app, đồng thời **gửi email ngay cho `ADMIN_NOTIFY_EMAILS`** (không áp giờ yên tĩnh cho email admin).
   - GV thấy: "Đã gửi yêu cầu. Quản trị viên sẽ liên hệ với bạn."
4. Admin ở `/admin/upgrades`: xem, liên hệ, đánh dấu đã thanh toán → **Mở khóa** (tạo `feature_grants (user_id, feature_key, expires_at, granted_by)`) → GV nhận thông báo "Đã mở khóa".
5. Thanh toán giai đoạn đầu làm thủ công: chuyển khoản qua ảnh VietQR do admin tải lên, nội dung `CE-<mã yêu cầu>`. Giai đoạn sau tích hợp payOS/VNPay/MoMo để tự mở khóa qua webhook.

Nguyên tắc:

- Chặn quyền **ở server** bằng `hasFeature(actor, key)` / `requireFeature`, không chỉ ẩn nút.
- **HS không bao giờ thấy màn hình đòi tiền.** HS hưởng tính năng qua gói của GV.
- Danh mục tính năng khai báo trong code (`src/lib/premium-features.ts`); chưa cần bảng giá trong DB.

### 9.2 Tính năng nên bán (hợp với GV Việt Nam)

| Ưu tiên | Tính năng                                                                                              | Vì sao hấp dẫn                                         | Công sức ước tính                                       |
| ------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------- |
| 1       | **Nhập đề trắc nghiệm từ Word/Excel/văn bản dán** ("Câu 1… A. B. C. D.", đáp án in đậm hoặc gạch chân) | GV VN soạn đề bằng Word; tiết kiệm rất nhiều thời gian | 3–4 ngày                                                |
| 2       | **Sổ điểm + xuất Excel** (điểm hệ số 1/2/3, trung bình môn theo kỳ)                                    | Khớp cách chấm của trường VN                           | 2–3 ngày                                                |
| 3       | **Chấm trực tiếp lên ảnh bài làm** (bút đỏ, đánh dấu, ghi chú)                                         | HS nộp ảnh chụp là chủ yếu; GV quen chấm bằng bút đỏ   | 4–5 ngày                                                |
| 4       | **Ngân hàng câu hỏi + trộn câu/đáp án + giới hạn thời gian + nhiều lượt làm**                          | Chống chép bài, dùng lại đề                            | 5–7 ngày                                                |
| 5       | **Thống kê từng câu hỏi** (câu nhiều HS sai, phân bố điểm)                                             | GV biết phần nào cần dạy lại                           | 1–2 ngày                                                |
| 6       | **AI gợi ý nhận xét / gợi ý điểm tự luận** (GV vẫn là người quyết định)                                | Gây ấn tượng mạnh khi demo                             | 3–5 ngày. Có chi phí API; cần ADR và chính sách dữ liệu |
| 7       | **Báo cáo phụ huynh hằng tuần** (email/Zalo, hoặc tài khoản phụ huynh)                                 | Phụ huynh VN rất quan tâm; có thể bán cho cả trường    | 4–6 ngày                                                |
| 8       | Nhắc hạn qua **Zalo OA**                                                                               | HS và phụ huynh VN dùng Zalo nhiều hơn email           | 3–5 ngày, cần OA đã xác minh                            |
| 9       | Đồng giảng dạy, chia sẻ thư viện bài tập giữa GV                                                       | Bán gói trường                                         | 3–4 ngày                                                |

Khuyến nghị đợt đầu, vừa để demo vừa để bán: **1, 2, 5**, kèm _khung trả phí và luồng yêu cầu_. Tính năng 3, 4, 6 làm khi đã có khách đặt mua.

---

## 10. Kế hoạch theo milestone

Mỗi milestone làm theo quy trình của repo: brief → code → `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int` (+ `test:e2e` nếu đụng UI) → review bảo mật → cập nhật PROGRESS, LESSONS, DECISIONS. Số ngày là ước tính làm có AI hỗ trợ.

| Mốc                                                          | Nội dung                                                                                                                                                                                                                                                                                                                                                                         | Ước tính | Tiêu chí xong                                                                                                                                                     |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **H0 · Dọn bàn giao**                                        | Backup; `scripts/handover-reset.ts` + `pnpm db:handover`; bỏ seed-demo khỏi build; xóa bucket; đổi secret; **cài R2 (13.1) và Resend (13.2)**; Workers Cron gọi `/api/cron`; `docs/HANDOVER.md`; chuyển Vercel Pro và tài khoản sang tên khách                                                                                                                                   | 0,5–1    | DB chỉ còn tài khoản đã chốt; deploy lại không sinh demo; HS nộp được ảnh từ điện thoại và GV mở xem được; email quên mật khẩu tới hộp thư chính (không vào spam) |
| **H0.5 · Chặn tạo tài khoản trái phép & leo quyền** (mục 12) | Một module tạo tài khoản duy nhất; trigger DB (vai trò không đổi được, chặn INSERT admin, chặn GV tự duyệt); tạo admin chỉ bằng CLI; duyệt theo tên miền chỉ sau khi xác minh email; bỏ "thêm HS bằng username" (thay bằng lời mời HS phải chấp nhận) và giới hạn quyền GV cấp lại mật khẩu; GV chờ duyệt bị chặn ở mọi action; bảo vệ admin cuối cùng; test leo quyền           | 1,5–2    | Toàn bộ test âm tính ở mục 12.4 pass; `grep` không còn `insert(users)` ngoài module tạo tài khoản; trigger chặn được cả khi gọi SQL trực tiếp bằng user của app   |
| **H1 · Sửa lỗi chức năng & đồng thời**                       | Rate limit bằng Postgres; bộ đếm đăng nhập nguyên tử; quiz và chấm dùng UPDATE có điều kiện; sửa tự lưu; tự lưu quiz; hàng đợi email có thứ tự và thử lại; **giới hạn email theo ngày + ưu tiên email giao dịch + gộp nhắc HS 1 email/ngày (13.3)**; thống kê bỏ HS đã rời lớp; GV sửa tên HS; `bulkCreateStudents` dùng transaction; index; job dọn dẹp; hàm `clientIp()` chung | 2        | Integration test mới cho từng race (gửi request song song), 5 actor cho action mới                                                                                |
| **H2 · UX mobile**                                           | `loading.tsx`, `error.tsx`, `not-found.tsx`, `global-error.tsx` tiếng Việt; tab bar có nhãn và vùng bấm ≥ 44px; PWA manifest; xử lý HEIC; nút "Nhắc các em chưa nộp"; loại bài "Tài liệu"; trang Lịch của HS; E2E mobile 375px                                                                                                                                                   | 3        | E2E mobile pass, axe không có lỗi serious, Lighthouse mobile ≥ 90 ở trang HS                                                                                      |
| **H3 · Admin vận hành + observability**                      | ADR; `onRequestError` → `error_events`; span processor OTel → `request_samples`/`request_stats_hourly`; beacon client + Web Vitals; `job_runs`; `/admin/ops` (p50/p95/p99, lỗi, mất request, cron, hàng đợi email); email cảnh báo; `/admin/classes`, `/admin/settings`                                                                                                          | 3–4      | Dashboard hiện số liệu thật; tự gây lỗi thì thấy trong 1 phút; không lưu PII hay nội dung bài                                                                     |
| **H4 · Theo dõi hành vi**                                    | `user_events`; `/admin/activity` (DAU/WAU/MAU, phễu, thiết bị, giờ cao điểm, dòng thời gian); trang Chính sách quyền riêng tư và Điều khoản                                                                                                                                                                                                                                      | 2        | Sự kiện ghi ở server, có retention, admin xem dòng thời gian thì ghi audit                                                                                        |
| **H5 · Khung trả phí + yêu cầu mở khóa**                     | `upgrade_requests`, `feature_grants`, `hasFeature/requireFeature`, trang "Nâng cao", modal yêu cầu, email admin, `/admin/upgrades`, ảnh VietQR                                                                                                                                                                                                                                   | 2–3      | GV gửi yêu cầu → admin nhận email → mở khóa → GV dùng được; GV chưa mở khóa bị server chặn                                                                        |
| **H6 · Tính năng trả phí đợt 1**                             | Nhập đề Word/Excel; sổ điểm + xuất Excel; thống kê từng câu                                                                                                                                                                                                                                                                                                                      | 6–9      | Mỗi tính năng có unit + integration test, nằm sau `requireFeature`                                                                                                |
| **H7 · Load test & go-live**                                 | Kịch bản k6: 300 HS nộp trong 1 phút, 50 GV mở dashboard; skill `security-review` và `engineering:deploy-checklist`; sửa landing cho khớp thực tế                                                                                                                                                                                                                                | 1        | p95 < 800ms ở luồng nộp bài, 0 lỗi 5xx, checklist deploy đủ                                                                                                       |

**Trạng thái (12/10/2026):** H0.5 ✅ (cả phần nâng cao) · H1 ✅ · H2 ✅ · H3 ✅ · H4 ✅ · H5 ✅ · H6 ✅ · H7 ✅. Còn lại là việc vận hành trên Vercel/Cloudflare/email theo `docs/HANDOVER.md` mục 11. Chi tiết: `docs/memory/PROGRESS.md`.

**Thứ tự gợi ý:** H0 → **H0.5** → H1 → H2 (đủ để bàn giao bản ổn định) → H5 → H3 → H4 → H6 → H7. H0.5 phải xong trước khi mở đăng ký GV hay phát tài khoản cho khách. Nếu khách cần dùng ngay thì bàn giao sau H2 và làm tiếp các mốc còn lại.

---

## 11. Câu hỏi cần chốt trước khi làm

1. **"1 tài khoản mẫu" là gì?** Đề xuất: 1 admin của khách + 1 GV mẫu (có 1 lớp, 1 HS, 2 bài). Hay chỉ giữ đúng 1 tài khoản admin?
2. Cho tôi chạy việc xóa (cấp `DIRECT_URL` qua biến môi trường của phiên) hay bạn tự chạy script trên máy mình?
3. Khách có chịu nâng **Vercel Pro** và gói Supabase trả phí không? Hay chuyển sang VPS + Docker (khi đó bật proxy Cloudflare)?
4. ~~Dùng storage và email nào?~~ **Đã chốt: R2 + Resend** (DECISIONS 2026-10-12). Còn cần: **tên miền của khách** (bắt buộc cho Resend), và ai tạo tài khoản Cloudflare/Resend (nên đứng tên khách)?
5. Tính năng trả phí bán theo **từng GV** hay **cả trường**? Giá đã có chưa (để hiển thị trên thẻ tính năng)?
6. Đợt đầu chọn tính năng trả phí nào (đề xuất: nhập đề Word/Excel, sổ điểm, thống kê câu hỏi)?
7. Web Push (cho HS không có email) có làm trong đợt này không?
8. Đóng lỗ GV chiếm tài khoản HS (mục 12.2): chọn **(a) lời mời HS phải chấp nhận + giới hạn cấp lại mật khẩu** (khuyến nghị) hay chỉ (b) giới hạn cấp lại mật khẩu?

---

## 12. Chặn tạo tài khoản trái phép và leo quyền (H0.5)

Yêu cầu: **không được** tạo tài khoản ADMIN qua API, **không được** tạo GV đã duyệt mà không qua admin, **không được** leo lên quyền cao hơn.

"API" ở đây gồm mọi server action. Mỗi hàm export trong file `"use server"` là một endpoint POST công khai: ai có action ID cũng gọi được và truyền được tham số tùy ý. Vì vậy mọi hàm export phải tự kiểm tra quyền, không dựa vào việc UI có hiện nút hay không.

### 12.1 Hiện trạng: những chỗ đã an toàn

Đã rà toàn bộ chỗ ghi vào bảng `users` (4 chỗ trong `src`, cộng script seed và migrate):

| Đường tạo tài khoản                                         | Vai trò                                                                                                                     | Đánh giá                                                                                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `registerAction` (`src/app/(auth)/actions.ts:124`)          | Luôn `TEACHER`, gán cứng                                                                                                    | ✅ Không lấy role từ form; `registerSchema` là `strictObject` nên gửi thêm `role=ADMIN` bị từ chối. ⚠️ Xem lỗ 1 bên dưới |
| `joinSignupAction` (`src/app/account-actions.ts:73`)        | Luôn `STUDENT`                                                                                                              | ✅                                                                                                                       |
| `bulkCreateStudents` (`src/server/services/classes.ts:214`) | Luôn `STUDENT`, cần là GV của lớp                                                                                           | ✅                                                                                                                       |
| `createTeacher` (`src/server/services/admin.ts:175`)        | `TEACHER` đã duyệt, chỉ ADMIN gọi được (`requireActor("ADMIN")` + `requireRole`)                                            | ✅ Admin tạo nghĩa là admin đã duyệt                                                                                     |
| Tạo ADMIN                                                   | Chỉ `docker/migrate.mjs` (khi chưa có admin nào và có `BOOTSTRAP_ADMIN_*`) và `scripts/seed.ts` (từ chối chạy ở production) | ✅ **Không có đường tạo admin qua web**                                                                                  |
| Đổi vai trò                                                 | Không có code nào `UPDATE users SET role`                                                                                   | ✅                                                                                                                       |
| Vai trò trong phiên                                         | `getActor()` đọc role từ DB mỗi request; cookie chỉ chứa token ngẫu nhiên                                                   | ✅ Không sửa cookie để đổi role được                                                                                     |

Có 43 server action. 7 action cố ý công khai: đăng nhập, đăng xuất, đăng ký GV, xác minh email, quên mật khẩu, đặt lại mật khẩu, HS đăng ký bằng mã lớp. 36 action còn lại đều gọi `requireActor(...)`/`getActor()` và kiểm tra vai trò trước khi làm gì.

### 12.2 Lỗ hổng tìm thấy

| Mức                   | Lỗ                                                                                                                               | Cách khai thác                                                                                                                                                                                                                                           | Chỗ                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 🔴 Cao                | **GV chiếm tài khoản của bất kỳ HS nào**                                                                                         | GV (đã duyệt) thêm username của một HS bất kỳ vào lớp mình. Username dễ đoán vì sinh từ họ tên, ví dụ `lehoanganh`. Sau đó bấm "Cấp lại mật khẩu" → nhận mật khẩu tạm → đăng nhập như HS đó, xem bài làm và điểm ở lớp của GV khác. HS không được báo gì | `addExistingStudent` (`classes.ts:237`) + `resetStudentPassword(s)` |
| 🔴 Cao (khi bật biến) | **Tự duyệt GV theo tên miền mà không sở hữu email**                                                                              | Khi `REQUIRE_EMAIL_VERIFICATION` khác `"true"` (mặc định hiện nay), `registerAction` coi email là đã xác minh. Nếu đặt `TEACHER_AUTO_APPROVE_DOMAINS=truong.edu.vn`, ai gõ `bat.ky@truong.edu.vn` (không cần có thật) cũng thành GV đã duyệt             | `actions.ts:124–135`                                                |
| 🟠 Vừa                | GV chờ duyệt vẫn gọi được action dùng `requireActor()` không truyền role                                                         | Hiện chưa khai thác được vì GV chờ duyệt chưa có lớp nào, nhưng chỉ an toàn nhờ may mắn                                                                                                                                                                  | `files/actions.ts:20`, `account-actions.ts`                         |
| 🟠 Vừa                | Admin cấp lại mật khẩu cho **admin khác** → nhận mật khẩu tạm → chiếm tài khoản admin đó (che dấu vết bằng danh tính người khác) | Một admin bị lộ mật khẩu kéo theo mọi admin                                                                                                                                                                                                              | `adminResetPassword`                                                |
| 🟡 Thấp               | Admin có thể khóa hết các admin khác. Chỉ chặn tự khóa mình, chưa có quy tắc "luôn còn ít nhất 1 admin hoạt động"                | —                                                                                                                                                                                                                                                        | `setUserStatus`                                                     |
| 🟡 Thấp               | Không có lớp bảo vệ ở DB: một bug sau này (ví dụ một action mới vô tình nhận `role` từ form) sẽ tạo được admin                   | —                                                                                                                                                                                                                                                        | —                                                                   |

### 12.3 Việc cần làm

**A. Một cửa tạo tài khoản**

1. Gom mọi lệnh tạo user vào `src/server/auth/accounts.ts` với các hàm chỉ định rõ vai trò: `registerTeacher` (chờ duyệt), `createTeacherByAdmin`, `createStudentByTeacher`, `signupStudentByCode`. Không hàm nào nhận tham số `role`.
2. Thêm unit test quét `src/` và **fail nếu có `insert(users)` ngoài `accounts.ts`**, để agent sau không thêm đường tạo tài khoản mới mà không ai biết.

**B. Admin chỉ tạo bằng dòng lệnh, không bao giờ qua web** 3. Thêm script `pnpm admin:create` chạy trên máy vận hành với `DIRECT_URL`. Script hỏi xác nhận, ghi audit, gửi email cho mọi admin hiện có. 4. Giữ bootstrap trong `migrate.mjs` cho lần đầu, nhưng ghi vào `HANDOVER.md`: xóa `BOOTSTRAP_ADMIN_PASSWORD` khỏi Vercel ngay sau khi tạo xong. 5. Không thêm UI "tạo admin" hay "đổi vai trò". Cần đổi vai trò thì tạo tài khoản mới bằng script.

**C. Không GV nào được duyệt nếu admin chưa duyệt** 6. Duyệt theo tên miền **chỉ áp dụng khi email đã được xác minh thật**. Chuyển việc duyệt từ lúc đăng ký sang lúc `verifyEmailToken` thành công. Khi `REQUIRE_EMAIL_VERIFICATION` khác `"true"` thì bỏ qua `TEACHER_AUTO_APPROVE_DOMAINS` và ghi cảnh báo vào log. 7. `approved_at` chỉ được đặt ở 2 chỗ: `approveTeacher` (admin) và bước xác minh email theo tên miền. 8. GV chờ duyệt chỉ vào được `/pending-approval`, `/settings`, đăng xuất. Sửa `requireActor()`: khi không truyền role mà actor là GV chưa duyệt thì chặn. Upload dùng `requireActor("TEACHER")` hoặc `requireActor("STUDENT")` theo `purpose`.

**D. Chặn GV chiếm tài khoản HS** 9. Bỏ "thêm HS bằng username". Thay bằng **lời mời**: HS nhận thông báo "Cô/Thầy X mời em vào lớp Y" và tự bấm Đồng ý. Cách khác là HS vào bằng mã lớp như hiện nay. 10. GV chỉ được cấp lại mật khẩu cho HS **do chính GV đó tạo** (`created_by = GV`), và chỉ khi mọi lớp HS đang học đều do GV đó dạy. Các trường hợp khác hiện thông báo "Liên hệ quản trị viên". 11. Mỗi lần cấp lại mật khẩu: HS nhận thông báo trong app ("Mật khẩu của em đã được giáo viên X cấp lại lúc …"), đồng thời ghi audit (đã có).

**E. Giới hạn trong chính quyền admin** 12. Admin không cấp lại mật khẩu cho admin khác. Admin quên mật khẩu thì dùng email reset hoặc script CLI. 13. Không cho khóa hay vô hiệu admin hoạt động cuối cùng. 14. Thao tác nhạy cảm của admin (tạo GV, cấp lại mật khẩu, khóa tài khoản) yêu cầu đã đăng nhập trong 15 phút gần nhất. Quá thì hỏi lại mật khẩu.

**F. Lớp bảo vệ cuối ở database** (migration mới, ghi ADR) 15. Trigger `users_guard` BEFORE INSERT/UPDATE trên `users`: - `UPDATE`: nếu `NEW.role <> OLD.role` thì báo lỗi (vai trò không đổi được). - `INSERT` với `role = 'ADMIN'`: chỉ cho phép khi transaction đã `SET LOCAL app.allow_admin_insert = 'on'`. Chỉ script CLI và bootstrap đặt cờ này. - Đặt `approved_at` (khi INSERT GV với giá trị khác null, hoặc UPDATE từ null sang có giá trị): chỉ cho phép khi transaction đã `SET LOCAL app.allow_teacher_approval = 'on'`. Chỉ `approveTeacher`, `createTeacherByAdmin` và bước xác minh email theo tên miền đặt cờ này. - Dùng `SET LOCAL` trong transaction nên chạy được với pooler kiểu transaction của Supabase. 16. (Khuyến nghị) App kết nối bằng một Postgres role riêng chỉ có quyền SELECT/INSERT/UPDATE/DELETE, không phải chủ bảng, nên không tắt được trigger. Migration vẫn chạy bằng role chủ qua `DIRECT_URL` (đã tách sẵn `DATABASE_URL`/`DIRECT_URL`). Kể cả khi có lỗi SQL injection, kẻ tấn công cũng không tạo được admin.

### 12.4 Test bắt buộc (integration, kiểu "phải thất bại")

- Gửi form đăng ký kèm `role=ADMIN`, `approvedAt`, `emailVerifiedAt` → bị từ chối, không tạo user.
- Gọi `createTeacherAction`, `approveTeacherAction`, `setStatusAction`, `resetPasswordAction` (admin) bằng GV, HS, GV chờ duyệt, chưa đăng nhập → 404 hoặc chuyển trang, DB không đổi.
- Đặt `TEACHER_AUTO_APPROVE_DOMAINS` trong khi tắt xác minh email → GV đăng ký vẫn chờ duyệt.
- Bật xác minh email → chỉ được duyệt sau khi bấm link xác minh.
- GV chờ duyệt gọi từng action của GV và `requestUploadAction` → bị chặn.
- GV A cấp lại mật khẩu cho HS do GV B tạo, hoặc HS học cả lớp của GV B → bị từ chối, mật khẩu không đổi.
- GV không còn thêm HS vào lớp mà HS chưa đồng ý.
- Admin cấp lại mật khẩu cho admin khác → bị từ chối. Khóa admin cuối cùng → bị từ chối.
- Chạy SQL trực tiếp bằng role của app: `UPDATE users SET role='ADMIN'`, `INSERT … role='ADMIN'`, `UPDATE users SET approved_at=now()` → trigger báo lỗi.
- Unit test: không có `insert(users)` ngoài `src/server/auth/accounts.ts`.

Chạy skill `security-review` trên diff của H0.5 trước khi merge.

---

## 13. Lưu file và email: R2 + Resend (đã chốt 12/10/2026)

Lý do chọn và phương án bị loại: `docs/memory/DECISIONS.md` (2026-10-12). Cả hai **không cần sửa code**, chỉ đặt biến trên Vercel. Riêng phần giới hạn email ở 13.3 cần code (thuộc H1).

### 13.1 Cài Cloudflare R2 (H0)

1. Tạo tài khoản Cloudflare đứng tên khách và bật R2 (Cloudflare có thể yêu cầu thêm thẻ thanh toán, kể cả khi dùng gói free).
2. Tạo bucket, ví dụ `classroom-edu-prod`. Để **private**, không bật public `r2.dev`, không gắn custom domain public. File chỉ tải qua presigned URL 5 phút sau khi app đã kiểm tra quyền.
3. Thêm CORS cho bucket:
   ```json
   [
     {
       "AllowedOrigins": ["https://<tên miền app>"],
       "AllowedMethods": ["PUT", "GET", "HEAD"],
       "AllowedHeaders": ["Content-Type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
4. Tạo API token loại **Object Read & Write**, chỉ áp cho bucket này.
5. Đặt biến trên Vercel (Production):
   - `S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com`
   - `S3_REGION=auto`
   - `S3_BUCKET=classroom-edu-prod`
   - `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (từ token)
   - `S3_FORCE_PATH_STYLE=true` (**không** đặt `false` như README cũ ghi). Với `false`, presigned URL có dạng `https://<bucket>.<account_id>.r2.cloudflarestorage.com`, khác origin mà `src/proxy.ts` đưa vào CSP (lấy từ `S3_ENDPOINT`), nên trình duyệt chặn upload và không hiện ảnh. Đã kiểm tra bằng `getSignedUrl` của SDK.
6. Kiểm tra CSP: `src/proxy.ts` thêm origin của `S3_ENDPOINT` (hoặc `S3_PUBLIC_ORIGIN` nếu đặt) vào `img-src`, `connect-src`, `media-src`. Mở DevTools khi thử bước 7: không được có lỗi "Refused to connect" hay "Refused to load the image".
7. Thử trên production bằng điện thoại thật: HS chụp ảnh nộp bài, đính kèm PDF; GV mở ảnh, tải PDF; HS lớp khác mở link file → 404.
8. Theo dõi dung lượng ở dashboard R2. Free 10GB, ước tính một trường khoảng 300 HS dùng hết trong 2–3 tháng; vượt mức tính $0,015/GB/tháng, tải ra miễn phí.

### 13.2 Cài Resend (H0)

1. Chuẩn bị **tên miền của khách** (bắt buộc). Nên quản lý DNS trên Cloudflare (chế độ DNS-only cho bản ghi trỏ về Vercel).
2. Tạo tài khoản Resend đứng tên khách và thêm tên miền. Nên dùng tên miền con riêng cho gửi mail, ví dụ `mail.<tên miền>`, để không ảnh hưởng mail công việc của trường.
3. Thêm các bản ghi DNS (SPF, DKIM) do Resend đưa ra, chờ trạng thái Verified. Thêm bản ghi DMARC, bắt đầu bằng `v=DMARC1; p=none; rua=mailto:<email admin>` rồi siết dần.
4. Tạo API key quyền **Sending access**, chỉ áp cho tên miền này.
5. Đặt biến trên Vercel:
   - `SMTP_HOST=smtp.resend.com`
   - `SMTP_PORT=465` (`src/server/mail.ts` tự bật TLS khi cổng là 465)
   - `SMTP_USER=resend`
   - `SMTP_PASS=<API key>`
   - `EMAIL_FROM="Classroom Edu <no-reply@mail.<tên miền>>"`
6. Thử: quên mật khẩu với một email Gmail và một email Outlook, kiểm tra mail vào hộp thư chính, link mở đúng `APP_URL`. Sau đó đặt `REQUIRE_EMAIL_VERIFICATION=true` và thử đăng ký GV.
7. Ghi vào `HANDOVER.md`: nơi xem log gửi mail (dashboard Resend), cách đổi API key, cách chuyển sang Brevo (chỉ đổi `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587` và thông tin đăng nhập).

### 13.3 Giữ trong giới hạn 100 email/ngày (code, thuộc H1)

Email giao dịch (xác minh, đặt lại mật khẩu) hiện gửi thẳng, email nhắc gửi qua hàng đợi `notifications`, cả hai dùng chung giới hạn 100/ngày của Resend free. Nếu email nhắc dùng hết hạn mức thì GV không nhận được link đặt lại mật khẩu. Cần:

1. **Đếm email đã gửi theo ngày (giờ VN)** trong bảng `email_sends (day, kind, count)`, với `kind` là `transactional`, `admin`, `reminder`.
2. Thêm biến `EMAIL_DAILY_LIMIT` (mặc định 100) và `EMAIL_REMINDER_SHARE` (mặc định 70%). Email nhắc chỉ được dùng tối đa 70 suất; email giao dịch và email báo admin luôn được gửi trước, tới giới hạn tổng.
3. **Gộp nhắc HS:** thay vì một email cho mỗi thông báo, mỗi HS có email nhận **tối đa 1 email/ngày** (gửi lúc 7:00 giờ VN), liệt kê bài mới, bài sắp đến hạn, bài đã trả. Thông báo trong app vẫn tạo ngay như hiện nay.
4. Hết suất trong ngày thì giữ lại trong hàng đợi, gửi tiếp hôm sau. Lỗi SMTP thì thử lại có giãn cách (đã có trong mục 3).
5. `/admin/ops` (H3) hiện số email đã gửi hôm nay trên giới hạn, số đang chờ, số lỗi. Cảnh báo admin khi dùng quá 80% hạn mức 3 ngày liền, vì đó là lúc cần chuyển sang Brevo hoặc nâng gói.
6. Test: hết suất email nhắc vẫn gửi được email đặt lại mật khẩu; một HS có 5 thông báo trong ngày chỉ nhận 1 email; không gửi trong giờ yên tĩnh.
