import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { recentlyAuthenticated, requireActor } from "@/server/auth/guard";
import { ReauthBar } from "./reauth-bar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { logoutAction } from "@/app/(auth)/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor("ADMIN");
  return (
    <div className="bg-background min-h-screen">
      <header className="border-border bg-surface sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-3 md:flex-nowrap md:px-8">
        <Link href="/admin" className="flex shrink-0 items-center gap-2 font-extrabold whitespace-nowrap">
          <span className="bg-primary text-on-primary flex size-9 items-center justify-center rounded-[12px]">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          Quản trị
        </Link>
        {/* Mobile: menu xuống hàng riêng, cuộn ngang nếu thiếu chỗ (không làm cả trang tràn ngang) */}
        <nav aria-label="Quản trị" className="order-last -mx-1 flex w-full gap-1 overflow-x-auto text-sm font-semibold whitespace-nowrap md:order-none md:mx-0 md:w-auto">
          <Link href="/admin" className="hover:bg-surface-2 rounded-[10px] px-3 py-2">Người dùng</Link>
          <Link href="/admin/audit" className="hover:bg-surface-2 rounded-[10px] px-3 py-2">Nhật ký</Link>
          <Link href="/admin/upgrades" className="hover:bg-surface-2 rounded-[10px] px-3 py-2">Nâng cấp</Link>
          <Link href="/admin/ops" className="hover:bg-surface-2 rounded-[10px] px-3 py-2">Hệ thống</Link>
          <Link href="/admin/activity" className="hover:bg-surface-2 rounded-[10px] px-3 py-2">Hành vi</Link>
          <Link href="/admin/settings" className="hover:bg-surface-2 rounded-[10px] px-3 py-2">Cài đặt</Link>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="text-muted hidden text-sm lg:inline">{actor.fullName}</span>
          <ThemeToggle />
          <form action={logoutAction}>
            <button type="submit" className="text-danger rounded-[10px] px-3 py-2 text-sm font-bold whitespace-nowrap hover:underline">
              Đăng xuất
            </button>
          </form>
        </div>
      </header>
      {!recentlyAuthenticated(actor) && <ReauthBar />}
      <main id="main" className="mx-auto max-w-6xl px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
