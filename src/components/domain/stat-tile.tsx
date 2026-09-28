import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  description?: React.ReactNode;
  variant?: "default" | "hero";
  badge?: React.ReactNode;
  action?: React.ReactNode;
}

export function StatTile({
  label,
  value,
  description,
  variant = "default",
  badge,
  action,
  className,
  children,
  ...props
}: StatTileProps) {
  const isHero = variant === "hero";

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-card p-5 md:p-6 transition-all",
        isHero
          ? "bg-primary text-on-primary shadow-primary"
          : "border border-border bg-surface text-foreground",
        className
      )}
      {...props}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-sm font-semibold tracking-wide",
              isHero ? "text-on-primary" : "text-muted"
            )}
          >
            {label}
          </span>
          {badge && <div>{badge}</div>}
        </div>

        <div
          className={cn(
            "my-2 font-extrabold tracking-tight tabular-nums",
            isHero ? "text-5xl md:text-6xl text-on-primary" : "text-3xl md:text-4xl text-foreground"
          )}
        >
          {value}
        </div>

        {description && (
          <div
            className={cn(
              "text-sm leading-relaxed",
              isHero ? "text-on-primary" : "text-muted"
            )}
          >
            {description}
          </div>
        )}
      </div>

      {(action || children) && (
        <div className="mt-4 flex flex-col gap-3">
          {children}
          {action}
        </div>
      )}
    </div>
  );
}
