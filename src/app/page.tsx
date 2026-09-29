import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing, CalendarClock, ClipboardCheck, Grid3x3, ShieldCheck, Smartphone } from "lucide-react";
import { ThemeToggle } from "@/components/layout";
import { AssignmentPreview, GradePreview, HeatmapPreview, Logo } from "@/components/marketing/previews";
import { getActor } from "@/server/auth/session";
import { homeFor } from "@/server/auth/guard";

const FEATURES = [
  { icon: ClipboardCheck, title: "Tự luận và trắc nghiệm", text: "Trắc nghiệm tự chấm ngay khi nộp. Tự luận chấm ở chế độ tập trung, chuyển bài bằng phím tắt.", tone: "bg-class-sky-bg text-class-sky-fg" },
  { icon: Grid3x3, title: "Heatmap theo dõi lớp", text: "Một bảng màu cho biết ai đúng hạn, ai trễ, ai chưa nộp.", tone: "bg-class-mint-bg text-class-mint-fg" },
  { icon: Smartphone, title: "Nộp bài bằng điện thoại", text: "Chụp ảnh bài làm và nộp. Ảnh được thu nhỏ, xóa vị trí GPS.", tone: "bg-class-peach-bg text-class-peach-fg" },
  { icon: CalendarClock, title: "Lên lịch đăng bài", text: "Soạn trước, hẹn giờ đăng, giao cùng lúc cho nhiều lớp.", tone: "bg-class-lilac-bg text-class-lilac-fg" },
  { icon: BellRing, title: "Nhắc hạn tự động", text: "Nhắc học sinh 24 giờ trước hạn, không gửi email vào ban đêm.", tone: "bg-class-butter-bg text-class-butter-fg" },
  { icon: ShieldCheck, title: "An toàn dữ liệu", text: "Chỉ giáo viên của lớp xem được bài nộp. Mật khẩu mã hóa argon2.", tone: "bg-class-rose-bg text-class-rose-fg" },
];

const STEPS = [
  { n: "1", title: "Tạo lớp", text: "Giáo viên tạo lớp và nhận mã mời, ví dụ TOAN10A1." },
  { n: "2", title: "Học sinh tham gia", text: "Học sinh mở link mời hoặc nhập mã lớp, không cần email." },
  { n: "3", title: "Giao, nộp, chấm", text: "Giao bài, học sinh nộp, giáo viên chấm và trả điểm kèm nhận xét." },
];

const btnPrimary =
  "bg-primary text-on-primary hover:bg-primary-hover shadow-primary rounded-control inline-flex h-12 items-center justify-center px-6 font-bold";
const btnGhost =
  "border-border bg-surface hover:bg-surface-2 rounded-control inline-flex h-12 items-center justify-center border px-6 font-bold";

export default async function Home() {
  const actor = await getActor();
  if (actor) redirect(actor.mustChangePassword ? "/change-password" : homeFor(actor.role));
  return (
    <div className="bg-background min-h-screen">
      <header className="border-border/60 bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="flex items-center gap-2">
            <a href="#tinh-nang" className="text-muted hover:text-foreground hidden px-3 text-sm font-semibold sm:block">Tính năng</a>
            <a href="#cach-dung" className="text-muted hover:text-foreground hidden px-3 text-sm font-semibold sm:block">Cách dùng</a>
            <ThemeToggle />
            <Link href="/login" className="bg-primary text-on-primary hover:bg-primary-hover rounded-control inline-flex h-10 items-center px-4 text-sm font-bold">
              Đăng nhập
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:py-20 lg:grid-cols-2">
          <div>
            <span className="bg-primary-soft text-primary inline-flex rounded-full px-3 py-1 text-xs font-bold">
              Miễn phí cho giáo viên
            </span>
            <h1 className="mt-5 text-4xl leading-[1.1] font-extrabold tracking-tight text-balance sm:text-5xl">
              Giao bài, nộp bài và chấm bài <span className="text-primary">ở một nơi</span>
            </h1>
            <p className="text-muted mt-5 max-w-lg text-lg leading-relaxed">
              Giáo viên giao bài cho nhiều lớp. Học sinh nộp bằng điện thoại. Điểm và nhận xét trả ngay trên web, không cần nhóm Zalo.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className={btnPrimary}>Tạo tài khoản giáo viên</Link>
              <Link href="/login" className={btnGhost}>Tôi đã có tài khoản</Link>
            </div>
            <p className="text-muted mt-5 text-sm">Học sinh: mở link mời hoặc nhập mã lớp giáo viên gửi.</p>
          </div>

          <div className="relative">
            <div aria-hidden className="bg-primary-soft rounded-card absolute inset-6 -z-0 rotate-3" />
            <div className="relative grid gap-4 sm:grid-cols-[1fr_1.2fr]">
              <AssignmentPreview className="sm:col-span-2" />
              <HeatmapPreview />
              <div className="flex flex-col gap-4">
                <GradePreview />
                <div className="bg-success-soft text-success rounded-card p-4" aria-hidden>
                  <p className="font-mono text-3xl font-bold">42</p>
                  <p className="text-sm font-semibold">bài chờ chấm hôm nay</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="tinh-nang" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
          <h2 className="text-3xl font-extrabold tracking-tight">Đủ dùng cho một lớp học thật</h2>
          <p className="text-muted mt-2 max-w-xl">Không cần cài đặt. Mở trình duyệt trên máy tính hoặc điện thoại là dùng được.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text, tone }) => (
              <div key={title} className="bg-surface border-border rounded-card border p-6">
                <span className={`rounded-tile flex size-11 items-center justify-center ${tone}`}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="text-muted mt-1.5 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="cach-dung" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
          <h2 className="text-3xl font-extrabold tracking-tight">Bắt đầu trong 3 bước</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="bg-surface border-border rounded-card border p-6">
                <span className="bg-primary text-on-primary flex size-9 items-center justify-center rounded-full font-extrabold">{s.n}</span>
                <h3 className="mt-4 font-bold">{s.title}</h3>
                <p className="text-muted mt-1.5 text-sm leading-relaxed">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-4 pt-6 pb-20">
          <div className="bg-primary text-on-primary rounded-card flex flex-col items-start gap-6 p-8 sm:p-12 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Sẵn sàng cho tiết học tới?</h2>
              <p className="mt-2">Tạo lớp đầu tiên chỉ mất một phút.</p>
            </div>
            <Link href="/register" className="bg-on-primary text-primary rounded-control inline-flex h-12 shrink-0 items-center px-6 font-bold hover:opacity-90">
              Tạo tài khoản giáo viên
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-border text-muted border-t py-8 text-center text-sm">
        © Classroom Edu · Dành cho giáo viên và học sinh Việt Nam
      </footer>
    </div>
  );
}
