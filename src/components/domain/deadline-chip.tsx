import * as React from "react";
import { Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DeadlineChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  dueDate: Date | string | number;
  now?: Date | string | number;
}

export type DeadlineStatus = "normal" | "urgent" | "overdue";

export function getDeadlineInfo(
  dueDateInput: Date | string | number,
  nowInput: Date | string | number = new Date()
): { text: string; status: DeadlineStatus } {
  const due =
    typeof dueDateInput === "object" && dueDateInput instanceof Date
      ? dueDateInput
      : new Date(dueDateInput);
  const now =
    typeof nowInput === "object" && nowInput instanceof Date
      ? nowInput
      : new Date(nowInput);

  if (Number.isNaN(due.getTime()) || Number.isNaN(now.getTime())) {
    return { text: "Không xác định", status: "normal" };
  }

  const diffMs = due.getTime() - now.getTime();

  if (diffMs < 0) {
    const absMs = Math.abs(diffMs);
    const diffHours = Math.floor(absMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays >= 1) {
      return { text: `Quá hạn ${diffDays} ngày`, status: "overdue" };
    }
    if (diffHours >= 1) {
      return { text: `Quá hạn ${diffHours} giờ`, status: "overdue" };
    }
    const diffMins = Math.max(1, Math.floor(absMs / (1000 * 60)));
    return { text: `Quá hạn ${diffMins} phút`, status: "overdue" };
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;

  if (diffDays >= 2) {
    return { text: `Còn ${diffDays} ngày`, status: "normal" };
  }
  if (diffDays === 1) {
    return {
      text:
        remainingHours > 0
          ? `Còn 1 ngày ${remainingHours} giờ`
          : `Còn 1 ngày`,
      status: "urgent",
    };
  }
  if (diffHours >= 1) {
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return {
      text:
        diffMins > 0
          ? `Còn ${diffHours} giờ ${diffMins} phút`
          : `Còn ${diffHours} giờ`,
      status: "urgent",
    };
  }
  const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  return { text: `Còn ${diffMins} phút`, status: "urgent" };
}

const STATUS_CLASSES: Record<DeadlineStatus, string> = {
  overdue: "bg-danger-soft text-danger border-transparent",
  urgent: "bg-warning-soft text-warning border-transparent",
  normal: "bg-surface-2 text-muted border-border",
};

export function DeadlineChip({
  dueDate,
  now,
  className,
  ...props
}: DeadlineChipProps) {
  const { text, status } = getDeadlineInfo(dueDate, now);
  const Icon = status === "overdue" ? AlertCircle : Clock;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors",
        STATUS_CLASSES[status],
        className
      )}
      role="status"
      aria-label={`Hạn nộp: ${text}`}
      suppressHydrationWarning
      {...props}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span suppressHydrationWarning>{text}</span>
    </span>
  );
}
