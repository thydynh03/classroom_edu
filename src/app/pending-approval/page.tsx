import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, LogOut, Settings } from "lucide-react";
import { requireActor, homeFor } from "@/server/auth/guard";
import { logoutAction } from "@/app/(auth)/actions";

export const metadata = { title: "Chờ duyệt · Classroom Edu" };

/** GV tự đăng ký, chưa được admin duyệt: chỉ thấy trang này (guard chặn toàn bộ phần GV). */
export default async function PendingApprovalPage() {
  const actor = await requireActor();
  if (actor.approved !== false) redirect(homeFor(actor.role));
  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-4 py-10">
      <div className="bg-surface border-border rounded-card w-full max-w-md border p-7 text-center shadow-sm">
        <span className="bg-warning-soft text-warning mx-auto flex size-14 items-center justify-center rounded-full" aria-hidden="true">
          <Clock className="size-7" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Tài khoản đang chờ duyệt</h1>
        <p className="text-muted mt-2 text-sm leading-relaxed">
          Chào {actor.fullName}, bạn đã đăng ký tài khoản giáo viên. Quản trị viên của trường sẽ kiểm tra và duyệt tài khoản; sau đó bạn
          tạo lớp và giao bài được ngay. Trang này tự mở phần giáo viên khi tài khoản được duyệt, bạn chỉ cần tải lại.
        </p>
        <p className="text-muted mt-3 text-sm">Cần duyệt gấp? Hãy liên hệ quản trị viên hoặc tổ công nghệ của trường.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/teacher"
            className="bg-primary text-on-primary hover:bg-primary-hover rounded-control focus-visible:ring-ring inline-flex h-10 items-center px-4 text-sm font-bold focus-visible:ring-2 focus-visible:outline-hidden"
          >
            Tải lại
          </Link>
          <Link
            href="/settings"
            className="border-border hover:bg-surface-2 rounded-control focus-visible:ring-ring inline-flex h-10 items-center gap-1.5 border px-4 text-sm font-bold focus-visible:ring-2 focus-visible:outline-hidden"
          >
            <Settings className="size-4" aria-hidden="true" /> Tài khoản
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-muted hover:text-foreground hover:bg-surface-2 rounded-control focus-visible:ring-ring inline-flex h-10 items-center gap-1.5 px-4 text-sm font-bold focus-visible:ring-2 focus-visible:outline-hidden"
            >
              <LogOut className="size-4" aria-hidden="true" /> Đăng xuất
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
