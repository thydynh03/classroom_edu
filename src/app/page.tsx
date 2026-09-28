import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/server/auth/session";
import { homeFor } from "@/server/auth/guard";

export default async function Home() {
  const actor = await getActor();
  if (actor) redirect(actor.mustChangePassword ? "/change-password" : homeFor(actor.role));
  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg text-center">
        <span className="bg-primary text-on-primary shadow-primary mx-auto mb-6 flex size-14 items-center justify-center rounded-[18px] text-2xl font-extrabold">
          C
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">Giao bài, nộp bài và chấm bài ở một nơi</h1>
        <p className="text-muted mx-auto mt-3 max-w-md">
          Giáo viên giao bài cho nhiều lớp, học sinh nộp bằng điện thoại, điểm và nhận xét được trả ngay trên web.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="bg-primary text-on-primary hover:bg-primary-hover shadow-primary rounded-control inline-flex h-11 items-center px-6 font-bold">
            Đăng nhập
          </Link>
          <Link href="/register" className="border-border bg-surface hover:bg-surface-2 rounded-control inline-flex h-11 items-center border px-6 font-bold">
            Tôi là giáo viên mới
          </Link>
        </div>
        <p className="text-muted mt-6 text-sm">Học sinh: mở link mời hoặc nhập mã lớp giáo viên gửi.</p>
      </div>
    </main>
  );
}
