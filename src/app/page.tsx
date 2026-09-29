import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Playfair_Display } from "next/font/google";
import {
  ArrowRight,
  Atom,
  BellRing,
  BookOpen,
  CalendarClock,
  Check,
  ClipboardCheck,
  Languages,
  Plus,
  Quote,
  ShieldCheck,
  Sigma,
  Smartphone,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout";
import { RevealOnScroll } from "@/components/marketing/reveal-on-scroll";
import { HeatmapPreview, Logo } from "@/components/marketing/previews";
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

// Thẻ lớp minh họa (dữ liệu mẫu, không phải lớp thật).
const CLASSES = [
  { icon: Sigma, subject: "Toán", name: "Toán 10A1", teacher: "Cô Hà", students: 42, tasks: 12, rate: 94, tone: "bg-class-sky-bg text-class-sky-fg", bar: "bg-class-sky-fg" },
  { icon: BookOpen, subject: "Ngữ văn", name: "Ngữ văn 11B2", teacher: "Thầy Quang", students: 38, tasks: 8, rate: 89, tone: "bg-class-peach-bg text-class-peach-fg", bar: "bg-class-peach-fg" },
  { icon: Languages, subject: "Tiếng Anh", name: "Tiếng Anh 12C", teacher: "Cô Linh", students: 40, tasks: 15, rate: 97, tone: "bg-class-mint-bg text-class-mint-fg", bar: "bg-class-mint-fg" },
  { icon: Atom, subject: "Vật lý", name: "Vật lý 10A3", teacher: "Thầy Nam", students: 41, tasks: 10, rate: 91, tone: "bg-class-lilac-bg text-class-lilac-fg", bar: "bg-class-lilac-fg" },
];

const QUOTES = [
  { icon: Users, text: "Mở heatmap là biết ngay bạn nào chưa nộp, không phải lướt nhóm Zalo tìm bài.", name: "Giáo viên chủ nhiệm", role: "theo dõi cả lớp" },
  { icon: ClipboardCheck, text: "Chấm ở chế độ tập trung, dùng phím tắt chuyển bài khi chấm cả lớp 42 bài.", name: "Giáo viên bộ môn", role: "chấm bài tự luận" },
  { icon: Smartphone, text: "Nộp bài bằng điện thoại. Có điểm và nhận xét là nhận thông báo ngay.", name: "Học sinh", role: "nộp bài và xem điểm" },
];

const ONE_PLACE = ["Đề bài", "Bài nộp", "Điểm", "Nhận xét"];

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
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2">
            {[["#vi-sao", "Tính năng"], ["#hanh-trinh", "Cách dùng"], ["#hoi-dap", "Hỏi đáp"]].map(([href, label]) => (
              <a key={href} href={href} className="nav-link text-muted hover:text-foreground hidden px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors lg:block">{label}</a>
            ))}
            <ThemeToggle />
            <Link href="/login" className="text-foreground hover:bg-surface-2 hidden h-10 rounded-full items-center px-4 text-sm font-bold whitespace-nowrap sm:inline-flex">
              Đăng nhập
            </Link>
            <Link href="/register" className="bg-primary text-on-primary hover:bg-primary-hover group inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 whitespace-nowrap sm:px-5 text-sm font-bold transition-colors">
              <span className="sm:hidden">Bắt đầu</span>
              <span className="hidden sm:inline">Tạo lớp miễn phí</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero C: chữ trái, ảnh học sinh làm nền + 2 thẻ giao diện sản phẩm */}
        <section className="mx-auto max-w-7xl px-4 pt-8 pb-10 sm:px-6 sm:pt-14 lg:px-8 lg:pt-12">
          <div className="grid items-center gap-12 lg:min-h-[40rem] lg:grid-cols-[1.15fr_1fr] xl:gap-20">
            <div className="max-w-[42.5rem]">
              <p className="hero-in text-primary text-xs font-bold tracking-[0.18em] uppercase">Nền tảng giao bài cho lớp học Việt Nam</p>
              <h1 className="hero-in mt-5 text-[clamp(2.75rem,4.6vw,4.5rem)] leading-[0.98] font-extrabold tracking-[-0.045em] [--d:80ms]">
                Lớp học của bạn,
                <span className="mt-1 block sm:whitespace-nowrap">
                  <span className={`${accent} tracking-[-0.02em]`}>gọn gàng</span> <span className="whitespace-nowrap">mỗi ngày.</span>
                </span>
              </h1>
              <p className="hero-in text-muted mt-6 max-w-lg text-lg leading-relaxed [--d:160ms] xl:text-xl xl:leading-relaxed">
                Giao bài cho nhiều lớp, học sinh nộp bằng điện thoại, chấm và trả điểm ngay trên web. Không cần lục nhóm Zalo tìm bài nữa.
              </p>
              <div className="hero-in mt-9 flex flex-col gap-3 [--d:240ms] sm:flex-row sm:items-center">
                <Link href="/register" className="bg-primary text-on-primary hover:bg-primary-hover shadow-primary group inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-bold transition-colors xl:h-13 xl:px-7">
                  Tạo tài khoản giáo viên
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
                <Link href="/login" className="border-border bg-surface hover:bg-surface-2 inline-flex h-12 items-center justify-center rounded-full border px-6 font-bold shadow-[0_1px_2px_rgb(0_0_0/0.05)] transition-colors xl:h-13 xl:px-7">
                  Tôi là học sinh
                </Link>
              </div>
            </div>

            {/* Ảnh chân dung làm nền, thẻ tiến độ bài tập và thẻ thông báo nộp bài nổi phía trước */}
            <div className="hero-in relative mx-auto w-full max-w-[33rem] pt-10 pb-8 [--d:200ms] lg:mr-0 lg:pt-16">
              <div className="relative ml-auto w-[86%] lg:w-[27.5rem] xl:w-[30rem]">
                <div className="ring-border/70 relative aspect-[4/5] overflow-hidden rounded-[1.75rem] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.35)] ring-1">
                  <Image src="/landing/laptop.webp" alt="Học sinh làm bài trên máy tính" fill priority sizes="(min-width: 1024px) 600px, 86vw" className="object-cover object-[center_30%]" />
                </div>
              </div>
              <div className="hero-in absolute top-0 left-0 w-[64%] [--d:420ms] sm:w-64 lg:top-4 xl:w-72" aria-hidden>
                <div className="bg-surface border-border rounded-[1.125rem] border p-4 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.25)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">Bài 3: Hàm số</p>
                      <p className="text-muted text-xs">Toán 10A1</p>
                    </div>
                    <span className="text-primary font-mono text-sm font-bold">76%</span>
                  </div>
                  <div className="bg-surface-2 mt-3 h-2 overflow-hidden rounded-full">
                    <div className="hero-bar bg-primary h-full w-[76%] rounded-full" />
                  </div>
                  <p className="text-muted mt-2 text-xs"><span className="text-foreground font-bold">32/42</span> học sinh đã nộp</p>
                </div>
              </div>
              <div className="hero-in absolute bottom-0 left-2 [--d:620ms] sm:left-6" aria-hidden>
                <div className="bg-surface border-border landing-float flex items-center gap-3 rounded-[1.125rem] border p-3 pr-5 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.25)]">
                  <span className="bg-success-soft text-success flex size-9 shrink-0 items-center justify-center rounded-full"><Check className="size-5" /></span>
                  <div>
                    <p className="text-sm font-bold">Khoa vừa nộp bài</p>
                    <p className="text-muted text-xs">Đúng hạn · Toán 10A1</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Số liệu */}
          <dl className="bg-surface rounded-3xl mt-14 grid grid-cols-2 gap-px overflow-hidden shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-16px_rgb(0_0_0/0.14)] sm:mt-20 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.value} className="reveal bg-surface p-5 sm:p-7 md:[&:not(:first-child)]:border-l md:border-border/60">
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-3xl font-extrabold tracking-[-0.03em] sm:text-[2.6rem]">{s.value}</dd>
                <dd className="text-muted mt-2 text-sm leading-snug">{s.label}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Dải môn học chạy ngang */}
        <div className="overflow-hidden py-6 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]" aria-hidden>
          <div className="landing-marquee flex w-max gap-8">
            {[...SUBJECTS, ...SUBJECTS].map((s, i) => (
              <span key={i} className="text-muted flex items-center gap-8 text-base font-semibold whitespace-nowrap">
                {s}<span className="bg-primary/50 size-1.5 rounded-full" />
              </span>
            ))}
          </div>
        </div>

        {/* Sứ mệnh */}
        <section className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div className="reveal">
            <p className="text-primary text-sm font-bold tracking-wide uppercase">Vì sao có Classroom Edu</p>
            <p className="mt-4 text-3xl leading-snug font-bold tracking-tight text-balance sm:text-4xl xl:text-[2.75rem] xl:leading-[1.2]">
              Giáo viên nên dành thời gian cho <span className={accent}>bài giảng</span>, không phải cho việc đi tìm bài nộp lẫn trong tin nhắn.
            </p>
          </div>
          <div className="reveal rounded-card relative aspect-[4/3] overflow-hidden">
            <Image src="/landing/writing.webp" alt="Học sinh viết bài" fill sizes="(min-width: 1024px) 460px, 100vw" className="object-cover" />
          </div>
          <div className="reveal bg-surface-2 border-border/70 rounded-3xl border p-8 sm:p-10 lg:col-span-2 lg:flex lg:items-center lg:gap-12">
            <p className="text-primary shrink-0 text-5xl font-extrabold tracking-[-0.04em] sm:text-6xl">1 nơi</p>
            <div className="mt-3 lg:mt-0 lg:flex lg:flex-1 lg:items-center lg:justify-between lg:gap-10">
              <p className="max-w-xl text-lg leading-relaxed font-semibold">cho đề bài, bài nộp, điểm và nhận xét. Không còn gom bài, nhắc hạn và nhập điểm thủ công.</p>
              <ul className="mt-4 flex flex-wrap gap-2 lg:mt-0 lg:grid lg:shrink-0 lg:grid-cols-2">
                {ONE_PLACE.map((t) => (
                  <li key={t} className="bg-surface border-border/70 flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold">
                    <Check className="text-primary size-3.5" aria-hidden />{t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Vì sao chọn */}
        <section id="vi-sao" className="bg-surface scroll-mt-16">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:grid-cols-2 lg:items-center">
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
                      <h3 className="font-bold lg:text-lg">{title}</h3>
                      <p className="text-muted mt-1 text-sm leading-relaxed lg:text-base">{text}</p>
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
        <section id="hanh-trinh" className="mx-auto max-w-7xl scroll-mt-16 px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <h2 className="reveal max-w-2xl text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
            Hành trình của <span className={accent}>một bài tập</span>
          </h2>
          <div className="relative mt-14">
            {/* Nối từ tâm bước 01 tới tâm bước 04 (4 cột, gap 2rem, nút 2.5rem canh trái) */}
            <div aria-hidden className="bg-border absolute top-5 right-[calc((100%_-_6rem)/4_-_1.25rem)] left-5 hidden h-0.5 lg:block">
              <div className="grow-x bg-primary h-full" />
            </div>
            <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {JOURNEY.map((j, i) => (
                <li key={j.step} className="reveal relative pl-14 sm:pl-0">
                  {/* Mobile: trục dọc nối các bước */}
                  {i < JOURNEY.length - 1 && <span aria-hidden className="bg-border absolute top-10 -bottom-8 left-5 w-px sm:hidden" />}
                  <span className="bg-primary text-on-primary ring-background absolute top-0 left-0 flex size-10 items-center justify-center rounded-full text-sm font-extrabold ring-8 sm:relative">
                    {j.step}
                  </span>
                  <h3 className="mt-2 text-lg font-bold sm:mt-5">{j.title}</h3>
                  <p className="text-muted mt-2 text-sm leading-relaxed">{j.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Các lớp tiêu biểu */}
        <section className="bg-surface">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="reveal text-4xl font-extrabold tracking-tight sm:text-5xl">
                Mỗi lớp một <span className={accent}>màu</span>, dễ nhận ra
              </h2>
              <p className="text-muted max-w-sm text-sm">Lớp học hiển thị bằng màu pastel riêng, giáo viên dạy nhiều lớp không bị nhầm.</p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CLASSES.map(({ icon: Icon, ...c }) => (
                <article key={c.name} className="reveal bg-background border-border/70 rounded-card overflow-hidden border shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)] transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_18px_36px_-16px_rgb(0_0_0/0.2)]">
                  <div className={`flex h-24 items-start justify-between p-4 ${c.tone}`}>
                    <span className="bg-surface/75 rounded-full px-2.5 py-1 text-xs font-bold">{c.subject}</span>
                    <Icon className="size-9 opacity-80" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold">{c.name}</h3>
                    <p className="text-muted text-sm">{c.teacher} · {c.students} học sinh</p>
                    <div className="mt-5 flex justify-between text-xs">
                      <span className="text-muted">{c.tasks} bài tập</span>
                      <span className="font-bold">{c.rate}% đã nộp</span>
                    </div>
                    <div className="bg-surface-2 mt-2 h-1.5 overflow-hidden rounded-full">
                      <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${c.rate}%` }} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Cảm nhận */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <h2 className="reveal text-4xl font-extrabold tracking-tight sm:text-5xl">
            Dùng thế nào <span className={accent}>trong lớp</span>
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {QUOTES.map(({ icon: Icon, ...q }) => (
              <figure key={q.name} className="reveal bg-surface border-border/70 rounded-card flex flex-col border p-7 shadow-[0_8px_30px_-16px_rgb(0_0_0/0.15)]">
                <Quote className="text-primary/60 size-7" aria-hidden />
                <blockquote className="mt-4 flex-1 text-lg leading-relaxed font-semibold">{q.text}</blockquote>
                <figcaption className="border-border/70 mt-6 flex items-center gap-3 border-t pt-5 text-sm">
                  <span className="bg-primary-soft text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-bold">{q.name}</span>
                    <span className="text-muted">{q.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Hỏi đáp */}
        <section id="hoi-dap" className="mx-auto grid max-w-7xl scroll-mt-16 gap-10 px-4 sm:px-6 lg:px-8 pb-20 lg:grid-cols-[1fr_1.5fr]">
          <h2 className="reveal text-4xl font-extrabold tracking-tight sm:text-5xl">
            Câu hỏi <span className={accent}>thường gặp</span>
          </h2>
          <div className="divide-border/60 divide-y">
            {FAQ.map((f) => (
              <details key={f.q} className="reveal group py-5">
                <summary className="hover:text-primary flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold transition-colors">
                  {f.q}
                  <Plus className="text-primary size-5 shrink-0 transition-transform group-open:rotate-45" aria-hidden />
                </summary>
                <p className="faq-answer text-muted mt-3 max-w-2xl leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Kêu gọi */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
          <div className="reveal bg-surface-2 border-border/70 relative overflow-hidden rounded-3xl border px-6 py-16 text-center sm:p-24">
            {/* Lưới chấm mờ dần ra mép, cùng tông kem của trang */}
            <div aria-hidden className="dot-grid absolute inset-0" />
            <h2 className="relative text-4xl leading-[1.05] font-extrabold tracking-[-0.03em] text-balance sm:text-6xl">
              Sẵn sàng cho <span className={`${accent} block`}>tiết học tới?</span>
            </h2>
            <p className="text-muted relative mx-auto mt-5 max-w-md text-lg">Tạo lớp đầu tiên chỉ mất một phút. Miễn phí cho giáo viên.</p>
            <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register" className="bg-primary text-on-primary hover:bg-primary-hover shadow-primary group inline-flex h-13 items-center gap-2 rounded-full px-8 font-bold transition-colors">
                Tạo tài khoản giáo viên <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
              <Link href="/login" className="border-border bg-surface hover:bg-background inline-flex h-13 items-center rounded-full border px-8 font-bold transition-colors">
                Đăng nhập
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-border border-t">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-4 sm:px-6 lg:px-8 py-14 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div className="col-span-2 max-w-sm lg:col-span-1">
            <Logo />
            <p className="text-muted mt-4 text-sm leading-relaxed">
              Giao bài, thu bài và trả điểm cho lớp học Việt Nam, gọn trong một nơi.
            </p>
          </div>
          <nav aria-label="Sản phẩm">
            <p className="text-sm font-bold">Sản phẩm</p>
            <ul className="text-muted mt-4 space-y-2.5 text-sm">
              {[["#vi-sao", "Tính năng"], ["#hanh-trinh", "Cách dùng"], ["#hoi-dap", "Hỏi đáp"]].map(([href, label]) => (
                <li key={href}><a href={href} className="hover:text-primary transition-colors">{label}</a></li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Tài khoản">
            <p className="text-sm font-bold">Tài khoản</p>
            <ul className="text-muted mt-4 space-y-2.5 text-sm">
              <li><Link href="/register" className="hover:text-primary transition-colors">Tạo tài khoản giáo viên</Link></li>
              <li><Link href="/login" className="hover:text-primary transition-colors">Đăng nhập</Link></li>
            </ul>
          </nav>
        </div>
        <div className="border-border border-t">
          <div className="text-muted mx-auto flex max-w-7xl flex-col gap-2 px-4 sm:px-6 lg:px-8 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Classroom Edu</p>
            <p>Dành cho giáo viên và học sinh Việt Nam</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
