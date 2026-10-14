import Link from "next/link";
import { UserCheck } from "lucide-react";
import { recentlyAuthenticated, requireActor } from "@/server/auth/guard";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { logoutAction } from "@/app/(auth)/actions";

/** Kiểm duyệt viên (admin phụ): chỉ duyệt GV và quản lý tài khoản GV/HS. */
export default async function ModLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor("MODERATOR");
  return (
    <div className="bg-background min-h-screen">
      <header className="border-border bg-surface sticky top-0 z-20 flex items-center gap-4 border-b px-4 py-3 md:px-8">
        <Link href="/mod" className="flex shrink-0 items-center gap-2 font-extrabold whitespace-nowrap">
          <span className="bg-primary text-on-primary flex size-9 items-center justify-center rounded-[12px]">
            <UserCheck className="size-5" aria-hidden="true" />
          </span>
          Kiểm duyệt
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link href="/settings" className="text-muted hidden text-sm hover:underline lg:inline">
            {actor.fullName}
          </Link>
          <ThemeToggle />
          <form action={logoutAction}>
            <button type="submit" className="text-danger rounded-[10px] px-3 py-2 text-sm font-bold whitespace-nowrap hover:underline">
              Đăng xuất
            </button>
          </form>
        </div>
      </header>
      {!recentlyAuthenticated(actor) && (
        <p className="bg-warning-soft border-warning/30 text-warning border-b px-4 py-2.5 text-sm font-semibold md:px-8">
          Duyệt giáo viên, khóa tài khoản và cấp mật khẩu tạm cần{" "}
          <Link href="/mod/reauth" prefetch={false} className="underline">
            xác nhận lại mật khẩu
          </Link>
          .
        </p>
      )}
      <main id="main" className="mx-auto max-w-6xl px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
