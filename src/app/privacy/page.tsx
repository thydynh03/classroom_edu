import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Chính sách quyền riêng tư · Classroom Edu" };

/** Trang công khai. Nội dung mô tả đúng những gì hệ thống thu thập; khách hàng nên nhờ pháp chế rà lại trước khi dùng chính thức. */
export default function PrivacyPage() {
  return (
    <main id="main" className="bg-background min-h-screen px-4 py-10">
      <article className="mx-auto max-w-2xl space-y-6 text-[15px] leading-relaxed">
        <Link href="/" className="text-muted hover:text-foreground inline-flex items-center gap-1 text-sm font-semibold">
          <ChevronLeft className="size-4" aria-hidden="true" /> Trang chủ
        </Link>
        <header>
          <h1 className="text-3xl font-extrabold tracking-tight">Chính sách quyền riêng tư</h1>
          <p className="text-muted mt-1 text-sm">Áp dụng cho giáo viên, học sinh và quản trị viên sử dụng Classroom Edu.</p>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">1. Dữ liệu chúng tôi lưu</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Tài khoản: họ tên, tên đăng nhập, email (nếu có), mật khẩu đã mã hóa một chiều (argon2id), thiết bị đang đăng nhập.</li>
            <li>Học tập: lớp, bài tập, bài làm và file nộp, điểm, nhận xét, lịch sử chấm.</li>
            <li>Thông báo: thông báo trong ứng dụng; địa chỉ đăng ký thông báo đẩy của trình duyệt nếu bạn bật.</li>
            <li>
              Số liệu sử dụng: loại thao tác (đăng nhập, mở bài, nộp bài…), loại thiết bị (điện thoại/máy tính), thời điểm. <b>Không</b> ghi nội
              dung bài làm, điểm hay nhận xét vào số liệu này.
            </li>
            <li>Số liệu kỹ thuật: thời gian xử lý trang, lỗi hệ thống, request không tới được máy chủ, loại mạng. Không kèm danh tính người dùng.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">2. Mục đích</h2>
          <p>Cung cấp chức năng giao bài, nộp bài, chấm bài và nhắc hạn; bảo mật tài khoản; tìm lỗi và cải thiện tốc độ; hỗ trợ người dùng khi có yêu cầu.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">3. Ai xem được</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Học sinh chỉ xem bài làm, điểm của chính mình và tên các bạn cùng lớp.</li>
            <li>Giáo viên chỉ xem dữ liệu của lớp mình dạy.</li>
            <li>Quản trị viên quản lý tài khoản và xem số liệu tổng hợp; không xem bài làm và điểm. Mọi thao tác quản trị được ghi nhật ký.</li>
            <li>Không bán hoặc chia sẻ dữ liệu cho bên thứ ba vì mục đích quảng cáo. Dữ liệu được lưu tại nhà cung cấp hạ tầng (máy chủ, cơ sở dữ liệu, lưu trữ file, gửi email) chỉ để vận hành dịch vụ.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">4. Thời gian lưu</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Số liệu sử dụng: 90 ngày. Số liệu kỹ thuật: 7–30 ngày. Sau đó tự động xóa.</li>
            <li>Dữ liệu học tập và tài khoản: trong thời gian bạn dùng dịch vụ, hoặc tới khi trường/giáo viên yêu cầu xóa.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">5. Quyền của bạn</h2>
          <p>
            Theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân, bạn có quyền được biết, xem, sửa, yêu cầu xóa dữ liệu và rút lại sự đồng ý. Học sinh dưới 16
            tuổi thực hiện qua cha mẹ hoặc giáo viên chủ nhiệm. Liên hệ giáo viên của lớp hoặc quản trị viên của trường để thực hiện.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">6. Thông báo đẩy và cookie</h2>
          <p>
            Ứng dụng chỉ dùng một cookie đăng nhập (bắt buộc để giữ phiên). Thông báo đẩy chỉ gửi khi bạn bật, và tắt được trong mục Tài khoản &amp; bảo mật.
          </p>
        </section>
      </article>
    </main>
  );
}
