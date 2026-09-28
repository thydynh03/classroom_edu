import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { logoutAction } from "@/app/(auth)/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor("ADMIN");
  return (
    <div className="bg-background min-h-screen">
      <header className="border-border bg-surface sticky top-0 z-20 flex items-center gap-4 border-b px-4 py-3 md:px-8">
        <Link href="/admin" className="flex items-center gap-2 font-extrabold">
          <span className="bg-primary text-on-primary flex size-9 items-center justify-center rounded-[12px]">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          Quản trị
        </Link>
        <nav aria-label="Quản trị" className="flex gap-1 text-sm font-semibold">
          <Link href="/admin" className="hover:bg-surface-2 rounded-[10px] px-3 py-1.5">Người dùng</Link>
          <Link href="/admin/audit" className="hover:bg-surface-2 rounded-[10px] px-3 py-1.5">Nhật ký</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-muted hidden text-sm sm:inline">{actor.fullName}</span>
          <ThemeToggle />
          <form action={logoutAction}>
            <button type="submit" className="text-danger rounded-[10px] px-3 py-1.5 text-sm font-bold hover:underline">
              Đăng xuất
            </button>
          </form>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
