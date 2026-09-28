import Link from "next/link";
import type { DisplayStatus } from "@/server/services/submission-rules";
import { cn } from "@/lib/utils";

const CELL: Record<DisplayStatus, { cls: string; label: string }> = {
  RETURNED: { cls: "bg-foreground", label: "Đã chấm, đã trả" },
  GRADED: { cls: "bg-foreground/70", label: "Đã chấm" },
  SUBMITTED: { cls: "bg-primary", label: "Đã nộp, chờ chấm" },
  LATE: { cls: "bg-late-bar", label: "Nộp trễ" },
  DRAFT: { cls: "bg-primary-soft", label: "Đang làm" },
  NOT_STARTED: { cls: "bg-primary-soft/50", label: "Chưa làm (còn hạn)" },
  MISSING: { cls: "bg-surface-2 heatmap-hatch", label: "Không nộp" },
};

/** Heatmap học sinh × bài tập (lấy từ hướng G). Là <table> để screen reader đọc được. */
export function Heatmap({
  cols,
  rows,
}: {
  cols: { id: string; title: string }[];
  rows: { id: string; fullName: string; cells: { assignmentId: string; status: DisplayStatus }[] }[];
}) {
  if (!cols.length || !rows.length) {
    return <p className="text-muted text-sm">Cần có học sinh và ít nhất một bài đã đăng để xem bảng theo dõi.</p>;
  }
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-[3px] text-xs">
          <caption className="sr-only">Tình trạng nộp bài theo học sinh và bài tập</caption>
          <thead>
            <tr>
              <th scope="col" className="text-muted w-40 text-left font-semibold">Học sinh</th>
              {cols.map((c, i) => (
                <th key={c.id} scope="col" className="text-muted min-w-9 font-semibold" title={c.title}>
                  <Link href={`/teacher/assignments/${c.id}`} className="hover:text-foreground">
                    B{i + 1}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row" className="max-w-40 truncate pr-2 text-left font-medium">{r.fullName}</th>
                {r.cells.map((c, i) => (
                  <td key={c.assignmentId} className="p-0">
                    <span
                      className={cn("block h-6 rounded-[4px]", CELL[c.status].cls)}
                      title={`${r.fullName} – ${cols[i].title}: ${CELL[c.status].label}`}
                    >
                      <span className="sr-only">{CELL[c.status].label}</span>
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="text-muted mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        {(["RETURNED", "SUBMITTED", "LATE", "DRAFT", "MISSING"] as DisplayStatus[]).map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded-[3px]", CELL[k].cls)} aria-hidden="true" />
            {CELL[k].label}
          </li>
        ))}
      </ul>
      <ol className="text-muted mt-3 grid gap-1 text-xs sm:grid-cols-2">
        {cols.map((c, i) => (
          <li key={c.id}>
            <b className="text-foreground">B{i + 1}</b> {c.title}
          </li>
        ))}
      </ol>
    </div>
  );
}
