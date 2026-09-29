import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { ThemeToggle } from "@/components/layout";
import { Logo } from "@/components/marketing/previews";

const POINTS = ["Giao bài cho nhiều lớp cùng lúc", "Biết ngay ai chưa nộp", "Chấm, nhận xét, trả điểm trên điện thoại"];

// Chia đôi: bên trái là ảnh lớp học (ẩn trên mobile), bên phải là form.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="landing bg-background text-foreground grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden text-white lg:flex lg:flex-col">
        <Image
          src="/landing/hero.webp"
          alt="Nhóm học sinh cùng học bên laptop"
          fill
          priority
          sizes="50vw"
          className="object-cover object-[center_35%]"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

        <div className="relative flex h-full flex-col p-10 xl:p-14">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-extrabold">
            <span className="bg-primary text-on-primary flex size-10 items-center justify-center rounded-[14px]">C</span>
            Classroom Edu
          </Link>

          <div className="mt-auto max-w-lg">
            {/* Mảnh giao diện minh họa (dữ liệu mẫu) để panel nói về sản phẩm, không chỉ là ảnh */}
            <div aria-hidden className="bg-surface text-foreground border-border mb-10 w-72 rounded-2xl border p-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">Bài 3: Hàm số</p>
                  <p className="text-muted text-xs">Toán 10A1 · hạn 21:00 thứ Sáu</p>
                </div>
                <span className="text-primary font-mono text-sm font-bold">76%</span>
              </div>
              <div className="bg-surface-2 mt-3 h-2 overflow-hidden rounded-full">
                <div className="bg-primary h-full w-[76%] rounded-full" />
              </div>
              <p className="text-muted mt-2 text-xs"><span className="text-foreground font-bold">32/42</span> học sinh đã nộp</p>
            </div>
            <p className="text-sm font-semibold tracking-[0.2em] text-white/75 uppercase">Dành cho giáo viên và học sinh</p>
            <h2 className="mt-4 text-4xl leading-[1.15] font-extrabold tracking-tight text-balance xl:text-5xl">
              Lớp học gọn gàng, bài tập không thất lạc.
            </h2>
            <ul className="mt-8 flex flex-wrap gap-2 text-sm font-semibold">
              {POINTS.map((p) => (
                <li key={p} className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <span aria-hidden className="bg-primary text-on-primary flex size-4 items-center justify-center rounded-full">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      <section className="flex flex-col px-4 pt-6 pb-8 sm:px-8 sm:pb-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="lg:invisible">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-muted text-center text-xs text-balance">© Classroom Edu · Dành cho giáo viên và học sinh Việt Nam</p>
      </section>
    </main>
  );
}
