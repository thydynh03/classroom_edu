"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  BookOpen,
  Star,
  Bell,
  LayoutDashboard,
  CheckSquare,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface MobileTabBarProps extends React.HTMLAttributes<HTMLElement> {
  role?: "teacher" | "student";
  pendingCount?: number;
  unreadCount?: number;
}

interface TabItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export function MobileTabBar({
  role = "student",
  pendingCount = 0,
  unreadCount = 0,
  className,
  ...props
}: MobileTabBarProps) {
  const pathname = usePathname();

  const studentTabs: TabItem[] = [
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

  const teacherTabs: TabItem[] = [
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
      label: "Thông báo",
      href: "/teacher/notifications",
      icon: Bell,
      badge: unreadCount,
    },
  ];

  const tabs = role === "teacher" ? teacherTabs : studentTabs;

  return (
    <nav
      className={cn(
        "fixed bottom-4 inset-x-4 z-40 mx-auto flex max-w-md items-center justify-around rounded-full bg-foreground p-1.5 text-background shadow-2xl transition-all pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))]",
        className
      )}
      aria-label={`Thanh điều hướng di động ${role === "teacher" ? "giáo viên" : "học sinh"}`}
      {...props}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isRootRole = tab.href === "/teacher" || tab.href === "/student";
        const isActive = isRootRole
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-label={
              tab.badge
                ? `${tab.label} (${tab.badge} mục mới)`
                : tab.label
            }
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-surface text-foreground shadow-xs"
                : "text-background/70 hover:text-background"
            )}
          >
            <Icon className="size-4.5 shrink-0 stroke-[2]" aria-hidden="true" />
            {isActive && <span>{tab.label}</span>}
            {typeof tab.badge === "number" && tab.badge > 0 && !isActive && (
              <span
                className="absolute top-1 right-1.5 size-2 rounded-full bg-danger ring-2 ring-foreground"
                aria-hidden="true"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
