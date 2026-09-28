import * as React from "react";
import Link from "next/link";
import { Bell, LogOut, Plus, Settings } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { logoutAction } from "@/app/(auth)/actions";

export interface TopBarProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  createHref?: string;
  createLabel?: string;
  notificationsHref: string;
  unreadCount?: number;
  userName: string;
  className?: string;
}

export function TopBar({
  title,
  subtitle,
  createHref,
  createLabel = "Tạo bài tập",
  notificationsHref,
  unreadCount = 0,
  userName,
  className,
}: TopBarProps) {
  return (
    <header
      className={cn(
        "border-border bg-surface/90 sticky top-0 z-20 flex min-h-18 items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-md md:px-8",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {subtitle && <div className="text-muted truncate text-xs font-medium">{subtitle}</div>}
        <div className="text-foreground truncate text-lg font-extrabold tracking-tight sm:text-xl md:text-2xl">
          {title}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
        <Link
          href={notificationsHref}
          aria-label={unreadCount ? `Thông báo (${unreadCount} chưa đọc)` : "Thông báo"}
          className="hover:bg-surface-2 focus-visible:ring-ring rounded-control relative flex size-10 items-center justify-center focus-visible:ring-2 focus-visible:outline-hidden"
        >
          <Bell className="text-muted size-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              className="bg-danger text-on-primary ring-surface absolute top-1 right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-bold tabular-nums ring-2"
              aria-hidden="true"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        <ThemeToggle />

        {createHref && (
          <Link
            href={createHref}
            className="bg-primary text-on-primary hover:bg-primary-hover shadow-primary rounded-control focus-visible:ring-ring inline-flex h-10 items-center gap-1.5 px-3.5 text-sm font-bold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
          >
            <Plus className="size-4 shrink-0 stroke-[2.5]" aria-hidden="true" />
            <span className="hidden sm:inline">{createLabel}</span>
            <span className="sm:hidden">Tạo</span>
          </Link>
        )}

        <details className="group relative md:hidden">
          <summary
            className="bg-primary-soft text-primary focus-visible:ring-ring flex size-10 cursor-pointer list-none items-center justify-center rounded-full text-xs font-bold focus-visible:ring-2 focus-visible:outline-hidden [&::-webkit-details-marker]:hidden"
            aria-label={`Tài khoản: ${userName}`}
          >
            {initials(userName)}
          </summary>
          <AccountMenu userName={userName} />
        </details>
        <form action={logoutAction} className="hidden md:block">
          <button
            type="submit"
            className="text-muted hover:bg-surface-2 hover:text-foreground focus-visible:ring-ring rounded-control flex size-10 items-center justify-center focus-visible:ring-2 focus-visible:outline-hidden"
            aria-label="Đăng xuất"
            title="Đăng xuất"
          >
            <LogOut className="size-5" aria-hidden="true" />
          </button>
        </form>
      </div>
    </header>
  );
}

function AccountMenu({ userName }: { userName: string }) {
  return (
    <div className="bg-surface border-border rounded-control absolute right-0 z-30 mt-2 w-56 border p-1.5 shadow-lg">
      <div className="text-muted px-3 py-2 text-xs font-semibold">{userName}</div>
      <Link
        href="/settings"
        className="hover:bg-surface-2 flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium"
      >
        <Settings className="size-4" aria-hidden="true" /> Tài khoản & bảo mật
      </Link>
      <form action={logoutAction}>
        <button
          type="submit"
          className="text-danger hover:bg-danger-soft flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium"
        >
          <LogOut className="size-4" aria-hidden="true" /> Đăng xuất
        </button>
      </form>
    </div>
  );
}
