import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  back,
  actions,
  eyebrow,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <div className="mb-6 space-y-2">
      {back && (
        <Link
          href={back.href}
          className="text-muted hover:text-foreground inline-flex items-center gap-1 text-sm font-semibold"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {eyebrow}
          <h1 className="text-2xl font-extrabold tracking-tight text-balance md:text-[28px]">{title}</h1>
          {description && <p className="text-muted text-sm">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Panel({
  title,
  action,
  className,
  tour,
  children,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** Mốc cho hướng dẫn lần đầu (ProductTour) */
  tour?: string;
  children: React.ReactNode;
}) {
  return (
    <section data-tour={tour} className={cn("bg-surface border-border rounded-card flex min-w-0 flex-col border p-5", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-[15px] font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="border-border rounded-card flex flex-col items-center justify-center gap-2 border border-dashed px-6 py-12 text-center">
      {icon && <div className="bg-primary-soft text-primary mb-1 flex size-12 items-center justify-center rounded-[14px]">{icon}</div>}
      <p className="font-bold">{title}</p>
      {description && <p className="text-muted max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Chỗ trống nhỏ trong một ô dashboard khi chưa có số liệu: giữ khung, nói rõ vì sao trống. */
export function EmptyHint({ icon, children, className }: { icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "border-border text-muted rounded-tile flex flex-1 flex-col items-center justify-center gap-2 border border-dashed px-4 py-6 text-center text-sm",
        className,
      )}
    >
      {icon && (
        <span className="bg-surface-2 flex size-9 items-center justify-center rounded-full [&_svg]:size-4" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "outline" | "soft";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-control focus-visible:ring-ring inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-bold whitespace-nowrap focus-visible:ring-2 focus-visible:outline-hidden [&_svg]:size-4",
        variant === "primary" && "bg-primary text-on-primary hover:bg-primary-hover shadow-primary",
        variant === "outline" && "border-border bg-surface hover:bg-surface-2 border",
        variant === "soft" && "bg-primary-soft text-primary",
        className,
      )}
    >
      {children}
    </Link>
  );
}
