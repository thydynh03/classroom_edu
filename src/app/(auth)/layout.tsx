import Link from "next/link";
import { ThemeToggle } from "@/components/layout";
import { AssignmentPreview, GradePreview, HeatmapPreview, Logo } from "@/components/marketing/previews";

// Chia đôi: bên trái giới thiệu (ẩn trên mobile), bên phải là form.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="bg-primary text-on-primary relative hidden overflow-hidden p-10 lg:flex lg:flex-col xl:p-14">
        <div aria-hidden className="bg-on-primary/10 absolute -top-24 -right-24 size-80 rounded-full" />
        <div aria-hidden className="bg-on-primary/10 absolute -bottom-32 -left-20 size-96 rounded-full" />
        <Link href="/" className="relative flex items-center gap-2.5 text-lg font-extrabold">
          <span className="bg-on-primary text-primary flex size-10 items-center justify-center rounded-[14px]">C</span>
          Classroom Edu
        </Link>
        <div className="relative mt-auto max-w-md">
          <h2 className="text-4xl leading-tight font-extrabold tracking-tight text-balance">
            Lớp học gọn gàng, bài tập không thất lạc.
          </h2>
          <p className="mt-4 text-base leading-relaxed">
            Giao bài cho nhiều lớp, xem ai đã nộp chỉ trong một cái nhìn, chấm và trả điểm ngay trên điện thoại.
          </p>
        </div>
        <div className="text-foreground relative mt-10 mb-auto grid max-w-xl grid-cols-[1fr_1.25fr] gap-4">
          <HeatmapPreview className="row-span-2" />
          <AssignmentPreview />
          <GradePreview />
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
