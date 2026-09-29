import type { TourStep } from "./product-tour";

// Nội dung hướng dẫn lần đầu. Mốc [data-tour] nằm trên dashboard; mục điều hướng tìm theo href (thanh bên hoặc thanh dưới).
export const TEACHER_TOUR: TourStep[] = [
  {
    title: "Chào mừng đến Classroom Edu",
    body: "Hướng dẫn nhanh khoảng 1 phút, đi qua cả quy trình: tạo lớp, thêm học sinh, giao bài, chấm bài và theo dõi. Bấm Bỏ qua nếu bạn đã quen.",
  },
  {
    target: 'a[href="/teacher/classes"]',
    title: "Tạo lớp học",
    body: "Vào Lớp học để tạo lớp. Mỗi lớp có màu riêng và một mã tham gia để học sinh tự vào lớp.",
  },
  {
    target: '[data-tour="classes"]',
    title: "Thêm học sinh",
    body: "Mở một lớp, vào tab Học sinh và dán danh sách họ tên hoặc nhập file Excel. Hệ thống tạo tài khoản kèm mật khẩu tạm; bạn tải file Excel để gửi cho học sinh.",
  },
  {
    target: 'a[href="/teacher/assignments"]',
    title: "Giao bài tập",
    body: "Tạo bài tự luận hoặc trắc nghiệm tự chấm, đặt hạn nộp, giao cho nhiều lớp một lần hoặc hẹn giờ đăng.",
  },
  {
    target: '[data-tour="pending"]',
    title: "Chấm bài",
    body: "Số bài chờ chấm luôn hiện ở đây. Bấm Bắt đầu chấm để chấm lần lượt, có điểm nhanh, nhận xét mẫu và phím tắt J/K.",
  },
  {
    target: '[data-tour="progress"]',
    title: "Theo dõi tiến độ",
    body: "Mỗi bài có thanh tiến độ: đã chấm, chờ chấm, chưa nộp. Tab Theo dõi trong từng lớp cho thấy em nào hay nộp trễ hoặc bỏ bài.",
  },
  {
    target: '[data-tour="calendar"]',
    title: "Hạn nộp 7 ngày tới",
    body: "Ngày có chấm màu là ngày có bài đến hạn, kèm số học sinh chưa nộp để bạn nhắc sớm.",
  },
  {
    target: 'a[href="/teacher/notifications"]',
    title: "Thông báo",
    body: "Báo cho bạn khi có bài nộp mới hoặc bài sắp đến hạn.",
  },
  {
    title: "Sẵn sàng rồi!",
    body: "Hãy bắt đầu bằng việc tạo lớp đầu tiên. Muốn xem lại hướng dẫn này, vào Tài khoản & bảo mật.",
  },
];

export const STUDENT_TOUR: TourStep[] = [
  {
    title: "Chào mừng em đến Classroom Edu",
    body: "Hướng dẫn nhanh cách xem bài, làm bài, nộp bài và xem điểm. Bấm Bỏ qua nếu em đã quen.",
  },
  {
    target: '[data-tour="week"]',
    title: "Lịch 7 ngày",
    body: "Ngày có chấm màu là ngày có bài phải nộp.",
  },
  {
    target: '[data-tour="focus"]',
    title: "Bài cần làm trước",
    body: "Bài gần hạn nhất luôn nằm ở đây. Bấm vào để làm bài; bài làm tự lưu nháp, làm xong bấm Nộp bài.",
  },
  {
    target: '[data-tour="todo"]',
    title: "Việc cần làm trong tuần",
    body: "Các bài còn lại xếp theo hạn nộp. Bài quá hạn nhưng thầy cô vẫn nhận nộp trễ sẽ hiện màu đỏ ở trên cùng.",
  },
  {
    target: '[data-tour="grades"]',
    title: "Điểm mới",
    body: "Bài được trả hiện ở đây kèm điểm; bấm vào để đọc nhận xét của thầy cô.",
  },
  {
    target: 'a[href="/student/classes"]',
    title: "Lớp học",
    body: "Xem các lớp đã tham gia và toàn bộ bài tập của từng lớp.",
  },
  {
    target: 'a[href="/student/notifications"]',
    title: "Thông báo",
    body: "Nhắc em khi có bài mới, bài sắp đến hạn hoặc bài đã có điểm.",
  },
  {
    title: "Xong rồi!",
    body: "Chúc em học tốt. Muốn xem lại hướng dẫn này, vào Tài khoản & bảo mật.",
  },
];
