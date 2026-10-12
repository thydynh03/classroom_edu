import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Màn trạng thái dùng chung cho 404 / không có quyền / lỗi / mất mạng.
 * App trả 404 cho cả tài nguyên không có quyền (không lộ việc tài nguyên tồn tại), nên một màn cho cả hai.
 */
export function StatusScreen({
  icon,
  tone = "neutral",
  title,
  description,
  actions,
  code,
  className,
}: {
  icon: React.ReactNode;
  tone?: "neutral" | "danger" | "warning";
  title: string;
  description: React.ReactNode;
  actions?: React.ReactNode;
  /** Mã lỗi để báo quản trị viên (digest), không chứa thông tin nhạy cảm */
  code?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-1 items-center justify-center px-4 py-12", className)}>
      <div role="alert" aria-live="polite" className="w-full max-w-md text-center">
        <span
          className={cn(
            "mx-auto flex size-14 items-center justify-center rounded-full [&_svg]:size-7",
            tone === "danger" && "bg-danger-soft text-danger",
            tone === "warning" && "bg-warning-soft text-warning",
            tone === "neutral" && "bg-primary-soft text-primary",
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{title}</h1>
        <div className="text-muted mt-2 text-sm leading-relaxed">{description}</div>
        {actions && <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>}
        {code && (
          <p className="text-muted mt-4 text-xs">
            Mã lỗi: <span className="font-mono">{code}</span>
          </p>
        )}
      </div>
    </div>
  );
}
