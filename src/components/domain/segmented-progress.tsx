import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  graded: number;
  pending: number;
  late: number;
  missing: number;
  total?: number;
  showLegend?: boolean;
}

export function SegmentedProgress({
  graded,
  pending,
  late,
  missing,
  total,
  showLegend = false,
  className,
  ...props
}: SegmentedProgressProps) {
  const sum = graded + pending + late + missing;
  const effectiveTotal = typeof total === "number" && total > 0 ? total : Math.max(sum, 1);

  const gradedPct = (graded / effectiveTotal) * 100;
  const pendingPct = (pending / effectiveTotal) * 100;
  const latePct = (late / effectiveTotal) * 100;
  const missingPct = Math.max(0, 100 - (gradedPct + pendingPct + latePct));

  const ariaDescription = `Tiến độ bài tập: ${graded} đã chấm, ${pending} chờ chấm, ${late} nộp trễ, ${missing} chưa nộp trên tổng số ${effectiveTotal}`;

  return (
    <div className={cn("w-full space-y-2", className)} {...props}>
      <div
        role="progressbar"
        aria-label={ariaDescription}
        aria-valuenow={graded + pending + late}
        aria-valuemin={0}
        aria-valuemax={effectiveTotal}
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2 border border-border/40"
      >
        {graded > 0 && (
          <span
            style={{ width: `${gradedPct}%` }}
            className="h-full bg-foreground transition-all duration-300"
            title={`Đã chấm: ${graded}`}
          />
        )}
        {pending > 0 && (
          <span
            style={{ width: `${pendingPct}%` }}
            className="h-full bg-primary transition-all duration-300"
            title={`Chờ chấm: ${pending}`}
          />
        )}
        {late > 0 && (
          <span
            style={{ width: `${latePct}%` }}
            className="h-full bg-late-bar transition-all duration-300"
            title={`Nộp trễ: ${late}`}
          />
        )}
        {missing > 0 && (
          <span
            style={{ width: `${missingPct}%` }}
            className="h-full bg-muted/20 transition-all duration-300"
            title={`Chưa nộp: ${missing}`}
          />
        )}
      </div>

      {showLegend && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-xs bg-foreground" aria-hidden="true" />
            <span>Đã chấm</span>
            <span className="font-semibold text-foreground tabular-nums">({graded})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-xs bg-primary" aria-hidden="true" />
            <span>Chờ chấm</span>
            <span className="font-semibold text-foreground tabular-nums">({pending})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-xs bg-late-bar" aria-hidden="true" />
            <span>Nộp trễ</span>
            <span className="font-semibold text-foreground tabular-nums">({late})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-xs bg-muted/30" aria-hidden="true" />
            <span>Chưa nộp</span>
            <span className="font-semibold text-foreground tabular-nums">({missing})</span>
          </div>
        </div>
      )}
    </div>
  );
}
