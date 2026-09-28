import * as React from "react";
import { cn } from "@/lib/utils";

export type ClassColor =
  | "sky"
  | "mint"
  | "peach"
  | "lilac"
  | "butter"
  | "rose";

export interface ClassChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  color: ClassColor;
  children: React.ReactNode;
}

export const COLOR_CLASSES: Record<ClassColor, string> = {
  sky: "bg-class-sky-bg text-class-sky-fg",
  mint: "bg-class-mint-bg text-class-mint-fg",
  peach: "bg-class-peach-bg text-class-peach-fg",
  lilac: "bg-class-lilac-bg text-class-lilac-fg",
  butter: "bg-class-butter-bg text-class-butter-fg",
  rose: "bg-class-rose-bg text-class-rose-fg",
};

export function ClassChip({
  color,
  children,
  className,
  ...props
}: ClassChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors",
        COLOR_CLASSES[color],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
