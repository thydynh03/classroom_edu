import Link from "next/link";
import { ClassChip, type ClassColor } from "@/components/domain/class-chip";
import { SegmentedProgress } from "@/components/domain/segmented-progress";
import { dueLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Stats = { total: number; submitted: number; graded: number; pending: number; late: number; missing: number };

const STATUS_LABEL = { DRAFT: "Nháp", SCHEDULED: "Đã lên lịch", PUBLISHED: "Đã đăng", ARCHIVED: "Lưu trữ" } as const;

export function AssignmentRow({
  a,
  className,
  classColor,
}: {
  a: {
    id: string;
    title: string;
    type: "WRITTEN" | "QUIZ";
    status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
    dueAt: Date;
    publishAt?: Date | null;
    stats: Stats;
  };
  className?: string;
  classColor?: ClassColor;
}) {
  return (
    <Link
      href={`/teacher/assignments/${a.id}`}
      className="hover:bg-surface-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_180px_90px_84px]"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-bold">{a.title}</p>
          {a.status !== "PUBLISHED" && (
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", a.status === "SCHEDULED" ? "bg-info-soft text-info" : "bg-surface-2 text-muted")}>
              {STATUS_LABEL[a.status]}
              {a.status === "SCHEDULED" && a.publishAt ? ` · ${dueLabel(a.publishAt)}` : ""}
            </span>
          )}
        </div>
        <p className="text-muted mt-0.5 flex flex-wrap items-center gap-2 text-xs">
          {className && classColor && <ClassChip color={classColor}>{className}</ClassChip>}
          {a.type === "QUIZ" ? "Trắc nghiệm" : "Tự luận"} · hạn {dueLabel(a.dueAt)}
        </p>
      </div>
      <SegmentedProgress
        graded={a.stats.graded}
        pending={a.stats.pending}
        late={0}
        missing={a.stats.missing}
        total={a.stats.total}
        className="col-span-2 md:col-span-1"
      />
      <p className="text-right text-sm font-bold tabular-nums max-md:col-start-2 max-md:row-start-1">
        {a.stats.submitted}/{a.stats.total}
        <span className="text-muted block text-[11px] font-medium">đã nộp</span>
      </p>
      <p className={cn("hidden text-right text-xs font-bold md:block", a.stats.pending ? "text-primary" : "text-muted")}>
        {a.stats.pending ? `${a.stats.pending} chờ chấm` : a.stats.late ? `${a.stats.late} trễ` : "—"}
      </p>
    </Link>
  );
}
