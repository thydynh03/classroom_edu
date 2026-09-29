import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Playfair_Display } from "next/font/google";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  Check,
  ClipboardCheck,
  Plus,
  ShieldCheck,
  Smartphone,
  Star,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout";
import { RevealOnScroll } from "@/components/marketing/reveal-on-scroll";
import { AssignmentPreview, GradePreview, HeatmapPreview, Logo } from "@/components/marketing/previews";
import { getActor } from "@/server/auth/session";
import { homeFor } from "@/server/auth/guard";

// Font serif nghiêng chỉ dùng cho điểm nhấn tiêu đề ở landing.
const display = Playfair_Display({ subsets: ["vietnamese"], style: ["italic"], weight: ["500", "600"], display: "swap" });

const STATS = [
  { value: "1 phút", label: "để tạo lớp và nhận mã mời" },
  { value: "3 chạm", label: "để học sinh chụp và nộp bài" },
  { value: "24 giờ", label: "nhắc hạn tự động trước giờ nộp" },
  { value: "100%", label: "bài nộp chỉ giáo viên của lớp xem được" },
];

const SUBJECTS = ["Toán", "Ngữ văn", "Tiếng Anh", "Vật lý", "Hóa học", "Sinh học", "Lịch sử", "Địa lý", "Tin học", "GDCD"];

const REASONS = [
  { icon: ClipboardCheck, title: "Tự luận và trắc nghiệm", text: "Trắc nghiệm tự chấm khi nộp. Tự luận chấm ở chế độ tập trung, chuyển bài bằng phím tắt." },
  { icon: CalendarClock, title: "Lên lịch và giao nhiều lớp", text: "Soạn trước, hẹn giờ đăng, giao cùng lúc cho 10A1, 10A2, 10A3." },
  { icon: Smartphone, title: "Nộp bài bằng điện thoại", text: "Chụp ảnh bài làm và nộp. Ảnh được thu nhỏ, xóa vị trí GPS." },
  { icon: BellRing, title: "Nhắc hạn đúng lúc", text: "Nhắc 24 giờ trước hạn, báo khi quá hạn, không gửi email vào ban đêm." },
];

const JOURNEY = [
  { step: "01", title: "Tạo lớp", text: "Đặt tên lớp, chọn màu. Hệ thống cấp mã mời như TOAN10A1." },
  { step: "02", title: "Giao bài", text: "Viết đề, đính kèm tài liệu, thêm câu trắc nghiệm, đặt hạn nộp." },
  { step: "03", title: "Học sinh nộp", text: "Học sinh mở bài trên điện thoại, làm và nộp. Trễ hạn được đánh dấu tự động." },
  { step: "04", title: "Chấm và trả bài", text: "Chấm từng bài, ghi nhận xét. Học sinh nhận điểm và thông báo ngay." },
];

const CLASSES = [
  { code: "T", name: "Toán 10A1", teacher: "Cô Hà", tasks: 12, rate: "94%", tone: "bg-class-sky-bg text-class-sky-fg" },
  { code: "V", name: "Ngữ văn 11B2", teacher: "Thầy Quang", tasks: 8, rate: "89%", tone: "bg-class-peach-bg text-class-peach-fg" },
  { code: "A", name: "Tiếng Anh 12C", teacher: "Cô Linh", tasks: 15, rate: "97%", tone: "bg-class-mint-bg text-class-mint-fg" },
  { code: "L", name: "Vật lý 10A3", teacher: "Thầy Nam", tasks: 10, rate: "91%", tone: "bg-class-lilac-bg text-class-lilac-fg" },
];

const QUOTES = [
  { text: "Mở heatmap là biết ngay bạn nào chưa nộp, không phải lướt nhóm Zalo tìm bài.", name: "Giáo viên chủ nhiệm", role: "theo dõi cả lớp" },
  { text: "Chấm ở chế độ tập trung, dùng phím tắt chuyển bài khi chấm cả lớp 42 bài.", name: "Giáo viên bộ môn", role: "chấm bài tự luận" },
  { text: "Nộp bài bằng điện thoại. Có điểm và nhận xét là nhận thông báo ngay.", name: "Học sinh", role: "nộp bài và xem điểm" },
];

const FAQ = [
  { q: "Học sinh có cần email để dùng không?", a: "Không. Học sinh tham gia bằng link mời hoặc mã lớp, đặt tên đăng nhập và mật khẩu là dùng được." },
  { q: "Một bài có giao cho nhiều lớp được không?", a: "Được. Khi giao bài, chọn nhiều lớp cùng lúc. Mỗi lớp có heatmap và danh sách chấm riêng." },
  { q: "Nộp trễ hạn thì sao?", a: "Giáo viên chọn có nhận bài trễ hay không. Bài trễ được đánh dấu tự động theo giờ máy chủ." },
  { q: "Dữ liệu bài làm có an toàn không?", a: "Mỗi bài nộp chỉ học sinh đó và giáo viên của lớp xem được. Mật khẩu được mã hóa bằng argon2." },
];

export default async function Home() {
  const actor = await getActor();
  if (actor) redirect(actor.mustChangePassword ? "/change-password" : homeFor(actor.role));
  const accent = `${display.className} text-primary font-medium`;
  return (
    <div className="landing bg-background text-foreground min-h-screen overflow-x-clip">
      <RevealOnScroll />
      <div aria-hidden className="scroll-progress bg-primary fixed inset-x-0 top-0 z-30 h-1 scale-x-0" />

      <header className="landing-header bg-background/85 sticky top-0 z-20 border-b border-transparent backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2">
            <a href="#vi-sao" className="text-muted hover:text-foreground hidden px-3 text-sm font-semibold md:block">Tính năng</a>
            <a href="#hanh-trinh" className="text-muted hover:text-foreground hidden px-3 text-sm font-semibold md:block">Cách dùng</a>
            <a href="#hoi-dap" className="text-muted hover:text-foreground hidden px-3 text-sm font-semibold md:block">Hỏi đáp</a>
            <ThemeToggle />
            <Link href="/login" className="text-foreground hover:bg-surface-2 rounded-control hidden h-10 items-center px-4 text-sm font-bold sm:inline-flex">
              Đăng nhập
            </Link>
            <Link href="/register" className="bg-primary text-on-primary hover:bg-primary-hover rounded-control inline-flex h-10 items-center px-4 text-sm font-bold">
              Bắt đầu
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pt-12 pb-10 sm:pt-20">
          <div className="grid items-end gap-8 lg:grid-cols-[1.3fr_1fr]">
            <h1 className="text-5xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Lớp học của bạn, <span className={accent}>gọn gàng</span> mỗi ngày
            </h1>
            <div className="lg:pb-3">
              <p className="text-muted text-lg leading-relaxed">
                Giao bài cho nhiều lớp, học sinh nộp bằng điện thoại, chấm và trả điểm ngay trên web. Không cần lướt nhóm Zalo tìm bài nữa.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="bg-primary text-on-primary hover:bg-primary-hover shadow-primary rounded-control group inline-flex h-12 items-center justify-center gap-2 px-6 font-bold">
                  Tạo tài khoản giáo viên
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
                <Link href="/login" className="border-border bg-surface hover:bg-surface-2 rounded-control inline-flex h-12 items-center justify-center border px-6 font-bold">
                  Tôi là học sinh
                </Link>
              </div>
            </div>
          </div>

          {/* Ảnh lớn + thẻ giao diện nổi */}
          <div className="relative mt-12">
            <div className="rounded-card relative aspect-[4/3] overflow-hidden sm:aspect-[21/9]">
              <Image src="/landing/laptop.webp" alt="Học sinh làm bài trên máy tính" fill priority sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
              <p className="absolute bottom-5 left-5 max-w-xs text-sm font-semibold text-white sm:bottom-8 sm:left-8 sm:text-base">
                Học sinh nộp bài từ bất cứ đâu, giáo viên thấy ngay trên bảng theo dõi.
              </p>
            </div>
            <div className="parallax absolute -top-6 right-4 hidden w-72 md:block lg:-right-6"><AssignmentPreview className="shadow-xl" /></div>
            <div className="parallax absolute right-10 -bottom-10 hidden w-80 md:block"><GradePreview className="shadow-xl" /></div>
            <div className="bg-surface rounded-card landing-float absolute top-1/3 -left-4 hidden items-center gap-3 p-4 shadow-xl lg:flex" aria-hidden>
              <span className="bg-success-soft text-success flex size-9 items-center justify-center rounded-full"><Check className="size-5" /></span>
              <div>
                <p className="text-sm font-bold">Khoa vừa nộp bài</p>
                <p className="text-muted text-xs">Đúng hạn · Toán 10A1</p>
              </div>
            </div>
          </div>

          {/* Số liệu */}
          <dl className="mt-20 grid grid-cols-2 gap-y-8 pb-4 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.value} className="reveal">
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-3xl font-extrabold tracking-tight sm:text-4xl">{s.value}</dd>
                <dd className="text-muted mt-1 text-sm">{s.label}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Dải môn học chạy ngang */}
        <div className="overflow-hidden py-5 opacity-80" aria-hidden>
          <div className="landing-marquee flex w-max gap-10">
            {[...SUBJECTS, ...SUBJECTS].map((s, i) => (
              <span key={i} className="text-muted flex items-center gap-10 text-lg font-bold whitespace-nowrap">
                {s}<Star className="text-primary size-4" />
              </span>
            ))}
          </div>
        </div>

        {/* Sứ mệnh */}
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:py-28 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div className="reveal">
            <p className="text-primary text-sm font-bold tracking-wide uppercase">Vì sao có Classroom Edu</p>
            <p className="mt-4 text-3xl leading-snug font-bold tracking-tight text-balance sm:text-4xl">
              Giáo viên nên dành thời gian cho <span className={accent}>bài giảng</span>, không phải cho việc đi tìm bài nộp lẫn trong tin nhắn.
            </p>
          </div>
          <div className="reveal rounded-card relative aspect-[4/3] overflow-hidden">
            <Image src="/landing/writing.webp" alt="Học sinh viết bài" fill sizes="(min-width: 1024px) 460px, 100vw" className="object-cover" />
          </div>
          <div className="reveal bg-foreground text-background rounded-card p-8 lg:col-span-2 lg:flex lg:items-center lg:gap-10">
            <p className="font-mono text-5xl font-bold shrink-0">1 nơi</p>
            <p className="mt-2 font-semibold">cho đề bài, bài nộp, điểm và nhận xét. Không còn gom bài, nhắc hạn và nhập điểm thủ công.</p>
          </div>
        </section>

        {/* Vì sao chọn */}
        <section id="vi-sao" className="bg-surface scroll-mt-16">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="reveal text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
                Vì sao giáo viên <span className={accent}>chọn</span> chúng tôi
              </h2>
              <ul className="mt-10 space-y-6">
                {REASONS.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="reveal flex gap-4">
                    <span className="bg-primary-soft text-primary rounded-tile flex size-12 shrink-0 items-center justify-center">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-bold">{title}</h3>
                      <p className="text-muted mt-1 text-sm leading-relaxed">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="reveal relative">
              <div className="rounded-card relative aspect-[4/5] overflow-hidden sm:aspect-[4/3] lg:aspect-[4/5]">
                <Image src="/landing/classroom.webp" alt="Giáo viên đứng lớp" fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
              </div>
              <div className="parallax absolute -bottom-8 left-4 w-64 sm:-left-6 sm:w-72"><HeatmapPreview className="shadow-xl" /></div>
              <div className="bg-surface rounded-control absolute top-5 right-5 flex items-center gap-2 px-3 py-2 text-sm font-semibold shadow-lg">
                <ShieldCheck className="text-success size-4" aria-hidden /> Chỉ GV của lớp xem bài nộp
              </div>
            </div>
          </div>
        </section>

        {/* Hành trình một bài tập */}
        <section id="hanh-trinh" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20 sm:py-28">
          <h2 className="reveal max-w-2xl text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
            Hành trình của <span className={accent}>một bài tập</span>
          </h2>
          <div className="relative mt-14">
            <div aria-hidden className="bg-border absolute top-5 right-0 left-0 hidden h-0.5 md:block">
              <div className="grow-x bg-primary h-full" />
            </div>
            <ol className="grid gap-8 md:grid-cols-4">
              {JOURNEY.map((j) => (
                <li key={j.step} className="reveal relative">
                  <span className="bg-primary text-on-primary ring-background relative flex size-10 items-center justify-center rounded-full text-sm font-extrabold ring-8">
                    {j.step}
                  </span>
                  <h3 className="mt-5 text-lg font-bold">{j.title}</h3>
                  <p className="text-muted mt-2 text-sm leading-relaxed">{j.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Các lớp tiêu biểu */}
        <section className="bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="reveal text-4xl font-extrabold tracking-tight sm:text-5xl">
                Mỗi lớp một <span className={accent}>màu</span>, dễ nhận ra
              </h2>
              <p className="text-muted max-w-sm text-sm">Lớp học hiển thị bằng màu pastel riêng, giáo viên dạy nhiều lớp không bị nhầm.</p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CLASSES.map((c) => (
                <article key={c.name} className="reveal bg-background rounded-card group p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)] transition hover:-translate-y-1">
                  <div className={`rounded-tile flex h-28 items-end p-4 ${c.tone}`}>
                    <span className="text-5xl font-extrabold opacity-90">{c.code}</span>
                  </div>
                  <h3 className="mt-4 font-bold">{c.name}</h3>
                  <p className="text-muted text-sm">{c.teacher}</p>
                  <div className="mt-4 flex justify-between pt-1 text-sm">
                    <span className="text-muted">{c.tasks} bài tập</span>
                    <span className="text-success font-bold">{c.rate} đã nộp</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Cảm nhận */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <h2 className="reveal text-4xl font-extrabold tracking-tight sm:text-5xl">
            Dùng thế nào <span className={accent}>trong lớp</span>
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {QUOTES.map((q, i) => (
              <figure key={q.name} className={`reveal rounded-card p-7 ${i === 1 ? "bg-foreground text-background" : "bg-surface shadow-[0_8px_30px_-12px_rgb(0_0_0/0.15)]"}`}>
                <blockquote className="text-lg leading-relaxed font-semibold">{q.text}</blockquote>
                <figcaption className="mt-6 text-sm">
                  <span className="font-bold">{q.name}</span>
                  <span className={i === 1 ? "" : "text-muted"}> · {q.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Hỏi đáp */}
        <section id="hoi-dap" className="mx-auto grid max-w-6xl scroll-mt-16 gap-10 px-4 pb-20 lg:grid-cols-[1fr_1.5fr]">
          <h2 className="reveal text-4xl font-extrabold tracking-tight sm:text-5xl">
            Câu hỏi <span className={accent}>thường gặp</span>
          </h2>
          <div className="divide-border/60 divide-y">
            {FAQ.map((f) => (
              <details key={f.q} className="reveal group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                  {f.q}
                  <Plus className="text-primary size-5 shrink-0 transition-transform group-open:rotate-45" aria-hidden />
                </summary>
                <p className="text-muted mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Kêu gọi */}
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="reveal rounded-card relative overflow-hidden p-10 text-center text-white sm:p-20">
            <Image src="/landing/hero.webp" alt="" fill sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover" />
            <div aria-hidden className="absolute inset-0 bg-black/60" />
            <h2 className="relative text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
              Sẵn sàng cho <span className={`${display.className} font-medium`}>tiết học tới?</span>
            </h2>
            <p className="relative mx-auto mt-4 max-w-md">Tạo lớp đầu tiên chỉ mất một phút. Miễn phí cho giáo viên.</p>
            <Link href="/register" className="bg-primary text-on-primary hover:bg-primary-hover rounded-control relative mt-8 inline-flex h-12 items-center gap-2 px-7 font-bold">
              Tạo tài khoản giáo viên <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-surface-2/60">
        <div className="text-muted mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm sm:flex-row">
          <Logo className="text-foreground" />
          <p>© Classroom Edu · Dành cho giáo viên và học sinh Việt Nam</p>
        </div>
      </footer>
    </div>
  );
}
