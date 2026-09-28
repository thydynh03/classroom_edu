# PROJECT — classroom_edu

Website giao bài tập và quản lý học tập cho giáo viên, học sinh, lớp học. Thuộc chuỗi website giáo dục của chủ dự án.
Mục tiêu: **đơn giản, hiện đại, dễ dùng**, đủ chuyên nghiệp để mở rộng. Không biến thành LMS phức tạp ở bản đầu.

Quy mô ban đầu: vài tới vài chục giáo viên, vài trăm học sinh (một trường / trung tâm).

## Vai trò

| Role    | Mô tả                                                                             | Cách có tài khoản                  |
| ------- | --------------------------------------------------------------------------------- | ---------------------------------- |
| ADMIN   | Vận hành: khóa tài khoản, hỗ trợ, xem audit log. Không mặc định đọc bài nộp/điểm. | Seed                               |
| TEACHER | Sở hữu lớp, giao bài, chấm bài.                                                   | Tự đăng ký + xác minh email        |
| STUDENT | Làm, nộp bài, xem điểm của chính mình.                                            | Mã lớp / link mời, hoặc GV tạo sẵn |

**Tài khoản học sinh do GV tạo:** tài khoản vĩnh viễn, chỉ mật khẩu ban đầu là tạm (`must_change_password = true`).
Lần đầu đăng nhập bắt buộc đổi mật khẩu. Sau đó đăng nhập bằng **username** + mật khẩu riêng. Email là tùy chọn.
Quên mật khẩu: có email → tự reset; không có email → GV của lớp bấm "Cấp lại mật khẩu" (tạo mật khẩu tạm mới, thu hồi mọi phiên).

## Phạm vi MVP (chỉ làm những mục này)

- **Auth:** đăng nhập email hoặc username + mật khẩu, logout, đăng ký GV, xác minh email GV, quên mật khẩu, đổi mật khẩu tạm bắt buộc, xem/thu hồi phiên, khóa tài khoản.
- **Lớp học:** tạo/sửa/lưu trữ lớp, mã tham gia 8 ký tự + link mời, thêm/xóa học sinh, tạo tài khoản học sinh hàng loạt.
- **Bài tập:** loại `WRITTEN` (tự luận) và `QUIZ`; tiêu đề, đề bài rich text giới hạn, file đính kèm, deadline, chọn nhiều lớp (tạo bản sao mỗi lớp, chung `group_id`), nháp / lên lịch / đăng / lưu trữ.
- **Nộp bài:** viết trực tiếp + upload file/ảnh, tự lưu nháp, nộp, rút lại trước khi chấm, tự đánh dấu trễ, nộp lại khi GV trả bài và cho phép.
- **Chấm bài:** điểm + nhận xét, lưu nháp điểm, trả bài (từng bài / hàng loạt), sửa điểm, lịch sử chấm append-only (`grade_event`). Điểm chỉ hiện cho HS khi đã **trả**.
- **Auto-grading:** câu 1 đáp án, nhiều đáp án, Đúng/Sai; 1 lượt làm; hiện kết quả theo `show_results` (ngay / sau hạn / thủ công).
- **Theo dõi (GV):** mỗi bài: tổng HS, đã nộp, chưa nộp, trễ, đã chấm, chưa chấm; hộp "Cần chấm" xuyên lớp; **heatmap học sinh × bài tập** mỗi lớp.
- **Thông báo:** in-app cho ASSIGNMENT_CREATED, ASSIGNMENT_DUE_SOON, ASSIGNMENT_OVERDUE, SUBMISSION_RECEIVED (gộp), ASSIGNMENT_RETURNED, FEEDBACK_ADDED. Email cho bài mới, sắp đến hạn, đã trả bài (có giờ yên tĩnh 21:30–6:30).

## Phase 2 (không code, chỉ chừa chỗ trong schema)

Rubric, nhiều lượt làm quiz, giới hạn thời gian, ngân hàng câu hỏi, trộn câu, co-teacher, import CSV, lịch, xuất bảng điểm CSV, tùy chỉnh thông báo, Google OAuth, 2FA, Postgres RLS, xuất/xóa dữ liệu cá nhân (NĐ 13/2023).

## Phase 3

Multi-tenant theo trường, SSO trường học, exam mode, analytics, PWA push, Zalo OA, public API.

## Luồng chính (phải có E2E test)

GV đăng nhập → tạo lớp → thêm HS → tạo bài → HS đăng nhập → xem bài → nộp → GV xem bài nộp → chấm → trả → HS xem điểm.

## Vòng đời submission

`NOT_STARTED → DRAFT → SUBMITTED → GRADED → RETURNED` (→ `DRAFT` nếu được nộp lại).
`SUBMITTED → DRAFT` khi HS rút lại (chỉ trước khi chấm). `is_late` là **cờ riêng**, không phải trạng thái.
`MISSING` chỉ là trạng thái hiển thị (quá hạn mà chưa nộp), không lưu DB.

## Câu hỏi còn mở (hỏi người dùng trước khi làm phần liên quan)

- Storage production: Cloudflare R2 (mặc định) hay Cloudinary cho ảnh? Code qua interface `StorageProvider` để đổi được.
- Số lượng người dùng thực tế và 1 hay nhiều trường.
