import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/layout";
import { Logo } from "@/components/marketing/previews";

const POINTS = ["Giao bài cho nhiều lớp cùng lúc", "Biết ngay ai chưa nộp", "Chấm, nhận xét, trả điểm trên điện thoại"];

// Chia đôi: bên trái là ảnh lớp học (ẩn trên mobile), bên phải là form.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="landing bg-background text-foreground grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden text-white lg:flex lg:flex-col">
        <Image
          src="/landing/group.webp"
          alt="Học sinh cùng làm bài trong lớp"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" />

        <div className="relative flex h-full flex-col p-10 xl:p-14">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-extrabold">
            <span className="bg-primary flex size-10 items-center justify-center rounded-[14px] text-white">C</span>
            Classroom Edu
          </Link>

          <div className="mt-auto max-w-lg">
            <p className="text-sm font-semibold tracking-[0.2em] text-white/70 uppercase">Dành cho giáo viên và học sinh</p>
            <h2 className="mt-4 text-4xl leading-[1.15] font-extrabold tracking-tight text-balance xl:text-5xl">
              Lớp học gọn gàng, bài tập không thất lạc.
            </h2>
            <ul className="mt-8 space-y-3 border-t border-white/20 pt-6 text-base text-white/90">
              {POINTS.map((p) => (
                <li key={p} className="flex items-center gap-3">
                  <span aria-hidden className="bg-primary size-1.5 rounded-full" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      <section className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="lg:invisible">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-muted text-center text-xs">© Classroom Edu · Dành cho giáo viên và học sinh Việt Nam</p>
      </section>
    </main>
  );
}
