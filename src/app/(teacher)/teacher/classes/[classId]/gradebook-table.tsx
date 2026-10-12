"use client";

import { useTransition } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setGradeWeightAction } from "../../actions";
import { cn } from "@/lib/utils";

type Col = { id: string; title: string; weight: number; dueLabel: string };
type Cell = { score10: number | null; state: "graded" | "pending" | "missing" | "open" };
type Row = { id: string; fullName: string; username: string; cells: Cell[]; average: number | null; missing: number };

const fmt = (n: number | null) => (n === null ? "" : n.toLocaleString("vi-VN", { maximumFractionDigits: 2 }));
const CELL_TEXT = { pending: "chờ chấm", missing: "thiếu", open: "" } as const;

export function GradebookTable({ className, cols, rows }: { className: string; cols: Col[]; rows: Row[] }) {
  const [pending, start] = useTransition();

  async function exportXlsx() {
    try {
      const { default: writeXlsxFile } = await import("write-excel-file/browser");
      const head = (value: string) => ({ value, fontWeight: "bold" as const });
      const data = [
        [head("STT"), head("Họ và tên"), head("Tên đăng nhập"), ...cols.map((c) => head(`${c.title} (hệ số ${c.weight})`)), head("Trung bình"), head("Số bài thiếu")],
        ...rows.map((r, i) => [
          { value: i + 1 },
          { value: r.fullName },
          { value: r.username },
          ...r.cells.map((c) => (c.score10 !== null ? { value: c.score10, type: Number } : { value: CELL_TEXT[c.state as keyof typeof CELL_TEXT] ?? "" })),
          r.average !== null ? { value: r.average, type: Number } : { value: "" },
          { value: r.missing, type: Number },
        ]),
      ];
      const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
      await writeXlsxFile(data, {
        sheet: "Sổ điểm",
        columns: [{ width: 6 }, { width: 28 }, { width: 18 }, ...cols.map(() => ({ width: 16 })), { width: 12 }, { width: 12 }],
        stickyRowsCount: 1,
      }).toFile(`so-diem-${className.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-")}-${date}.xlsx`);
    } catch {
      toast.error("Không tạo được file Excel. Thử lại.");
    }
  }

  if (!cols.length) return <p className="text-muted text-sm">Lớp chưa có bài đã đăng.</p>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted text-sm">Điểm quy về thang 10. Trung bình = Σ(điểm × hệ số) / Σ hệ số trên các bài đã chấm.</p>
        <Button variant="outline" onClick={exportXlsx}>
          <FileDown aria-hidden="true" /> Xuất Excel
        </Button>
      </div>
      <div className="border-border overflow-x-auto rounded-[14px] border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs">
            <tr>
              <th scope="col" className="bg-surface-2 sticky left-0 min-w-44 px-3 py-2 font-semibold">Học sinh</th>
              {cols.map((c) => (
                <th key={c.id} scope="col" className="min-w-32 px-3 py-2 align-bottom font-semibold">
                  <span className="line-clamp-2">{c.title}</span>
                  <span className="text-muted block font-normal">{c.dueLabel}</span>
                  <label className="mt-1 flex items-center gap-1 font-normal">
                    <span className="text-muted">Hệ số</span>
                    <select
                      aria-label={`Hệ số bài ${c.title}`}
                      defaultValue={c.weight}
                      disabled={pending}
                      onChange={(e) =>
                        start(async () => {
                          const r = await setGradeWeightAction(c.id, Number(e.target.value));
                          if (r.error) toast.error(r.error);
                        })
                      }
                      className="border-border bg-surface rounded-[8px] border px-1 py-0.5"
                    >
                      {[1, 2, 3].map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </label>
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-right font-semibold">Trung bình</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row" className="bg-surface sticky left-0 px-3 py-2 text-left font-medium">
                  {r.fullName}
                  {r.missing > 0 && <span className="text-danger block text-xs font-normal">thiếu {r.missing} bài</span>}
                </th>
                {r.cells.map((c, i) => (
                  <td key={cols[i].id} className={cn("px-3 py-2 tabular-nums", c.state === "missing" && "text-danger", c.state === "pending" && "text-muted")}>
                    {c.score10 !== null ? fmt(c.score10) : (CELL_TEXT[c.state as keyof typeof CELL_TEXT] ?? "")}
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-bold tabular-nums">{fmt(r.average) || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
