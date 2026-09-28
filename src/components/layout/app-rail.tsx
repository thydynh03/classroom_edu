"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  ClipboardList,
  CalendarCheck,
  Star,
  Bell,
  GraduationCap,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface AppRailProps extends React.HTMLAttributes<HTMLElement> {
  role?: "teacher" | "student";
  pendingCount?: number;
  unreadCount?: number;
  userName: string;
  userSubtitle: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export function AppRail({
  role = "teacher",
  pendingCount = 0,
  unreadCount = 0,
  userName,
  userSubtitle,
  className,
  ...props
}: AppRailProps) {
  const pathname = usePathname();

  const teacherItems: NavItem[] = [
    {
      label: "Tổng quan",
      href: "/teacher",
      icon: LayoutDashboard,
    },
    {
      label: "Cần chấm",
      href: "/teacher/grading",
      icon: CheckSquare,
      badge: pendingCount,
    },
    {
      label: "Lớp học",
      href: "/teacher/classes",
      icon: GraduationCap,
    },
    {
      label: "Bài tập",
      href: "/teacher/assignments",
      icon: ClipboardList,
    },
  ];

  const studentItems: NavItem[] = [
    {
      label: "Hôm nay",
      href: "/student",
      icon: CalendarCheck,
    },
    {
      label: "Lớp học",
      href: "/student/classes",
      icon: BookOpen,
    },
    {
      label: "Điểm số",
      href: "/student/grades",
      icon: Star,
    },
    {
      label: "Thông báo",
      href: "/student/notifications",
      icon: Bell,
      badge: unreadCount,
    },
  ];

  const items = role === "teacher" ? teacherItems : studentItems;
  const homeHref = role === "teacher" ? "/teacher" : "/student";
  const userInitials = initials(userName);
  const userRole = userSubtitle;

  return (
    <aside
      className={cn(
        "flex w-20 shrink-0 flex-col items-center border-r border-border bg-sidebar py-5 select-none",
        className
      )}
      aria-label={`Thanh điều hướng ${role === "teacher" ? "giáo viên" : "học sinh"}`}
      {...props}
    >
      {/* Brand logo */}
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={homeHref}
              className="flex size-[42px] shrink-0 items-center justify-center rounded-[14px] bg-primary text-xl font-extrabold text-on-primary shadow-primary transition-transform hover:scale-105 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Classroom Edu - Trang chủ"
            >
              C
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Classroom Edu</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Nav items */}
      <nav className="mt-6 flex flex-1 flex-col items-center gap-2.5">
        <TooltipProvider delayDuration={150}>
          {items.map((item) => {
            const Icon = item.icon;
            const isRootRole = item.href === "/teacher" || item.href === "/student";
            const isActive = isRootRole
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    aria-label={
                      item.badge
                        ? `${item.label} (${item.badge} mục chờ)`
                        : item.label
                    }
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "relative flex size-[46px] items-center justify-center rounded-[14px] transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "bg-primary-soft text-primary font-bold"
                        : "text-muted hover:bg-surface-2 hover:text-foreground"
                    )}
                  >
                    <Icon className="size-5 shrink-0 stroke-[1.8]" />
                    {typeof item.badge === "number" && item.badge > 0 && (
                      <span
                        className="absolute top-1 right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold leading-none text-on-primary tabular-nums ring-2 ring-sidebar"
                        aria-hidden="true"
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </nav>

      {/* Spacer */}
      <div className="flex-1" aria-hidden="true" />

      {/* User Avatar */}
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/settings"
              className="mt-auto flex size-11 items-center justify-center rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Tài khoản: ${userName} (${userRole})`}
            >
              <Avatar className="size-10 border-2 border-border bg-primary-soft text-primary font-bold">
                <AvatarFallback className="bg-primary-soft text-primary font-bold text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <div className="font-semibold">{userName}</div>
            <div className="text-xs text-muted">{userRole}</div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </aside>
  );
}
