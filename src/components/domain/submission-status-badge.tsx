import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type SubmissionStatus =
  | "NOT_STARTED"
  | "DRAFT"
  | "SUBMITTED"
  | "LATE"
  | "GRADED"
  | "RETURNED"
  | "MISSING";

export interface SubmissionStatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: SubmissionStatus;
}

export const SUBMISSION_STATUS_CONFIG: Record<
  SubmissionStatus,
  { label: string; className: string }
> = {
  NOT_STARTED: {
    label: "Chưa làm",
    className: "border-border bg-surface-2 text-muted",
  },
  DRAFT: {
    label: "Nháp",
    className: "border-border bg-surface-2 text-foreground",
  },
  SUBMITTED: {
    label: "Đã nộp",
    className: "border-transparent bg-info-soft text-info",
  },
  LATE: {
    label: "Nộp trễ",
    className: "border-transparent bg-warning-soft text-warning",
  },
  GRADED: {
    label: "Đã chấm",
    className: "border-transparent bg-success-soft text-success",
  },
  RETURNED: {
    label: "Đã trả",
    className: "border-transparent bg-info-soft text-info",
  },
  MISSING: {
    label: "Quá hạn",
    className: "border-transparent bg-danger-soft text-danger",
  },
};

export function SubmissionStatusBadge({
  status,
  className,
  ...props
}: SubmissionStatusBadgeProps) {
  const config = SUBMISSION_STATUS_CONFIG[status];

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
      {...props}
    >
      {config.label}
    </Badge>
  );
}
