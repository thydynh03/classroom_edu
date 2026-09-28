"use client";

import * as React from "react";
import { useTransition } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { markAllReadAction } from "@/app/account-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Item = { id: string; title: string; href: string; createdAt: string; readAt: string | null; type: string };

const DOT: Record<string, string> = {
  ASSIGNMENT_CREATED: "bg-info",
  ASSIGNMENT_DUE_SOON: "bg-warning",
  ASSIGNMENT_OVERDUE: "bg-danger",
  ASSIGNMENT_RETURNED: "bg-success",
  SUBMISSION_RECEIVED: "bg-primary",
};

export function NotificationList({ items }: { items: Item[] }) {
  const [pending, start] = useTransition();
  const unread = items.filter((i) => !i.readAt).length;
  if (!items.length)
    return (
      <div className="border-border rounded-card flex flex-col items-center gap-2 border border-dashed px-6 py-12 text-center">
        <Bell className="text-muted size-6" aria-hidden="true" />
        <p className="font-bold">Chưa có thông báo</p>
        <p className="text-muted text-sm">Bài mới, hạn nộp và bài được trả sẽ hiện ở đây.</p>
      </div>
    );
  return (
    <div className="space-y-3">
      {unread > 0 && (
        <Button variant="outline" size="sm" disabled={pending} onClick={() => start(() => markAllReadAction())}>
          <CheckCheck aria-hidden="true" /> Đánh dấu đã đọc tất cả ({unread})
        </Button>
      )}
      <ul className="bg-surface border-border rounded-card divide-border divide-y overflow-hidden border">
        {items.map((n) => (
          <li key={n.id}>
            <a href={`/n/${n.id}`} className={cn("hover:bg-surface-2 flex items-start gap-3 px-4 py-3", !n.readAt && "bg-primary-soft/40")}>
              <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", DOT[n.type] ?? "bg-muted", n.readAt && "opacity-40")} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", !n.readAt ? "font-bold" : "font-medium")}>
                  {n.title}
                  {!n.readAt && <span className="sr-only"> (chưa đọc)</span>}
                </p>
                <p className="text-muted text-xs">
                  {new Date(n.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
