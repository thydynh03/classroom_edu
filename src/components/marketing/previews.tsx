// Mảnh giao diện minh họa (tĩnh, không dữ liệu thật) cho landing page và trang đăng nhập.
import { cn } from "@/lib/utils";

const HEAT = [
  "bg-success", "bg-success", "bg-success", "bg-late-bar", "bg-success", "bg-surface-2",
  "bg-success", "bg-late-bar", "bg-success", "bg-success", "bg-danger", "bg-success",
  "bg-success", "bg-success", "bg-surface-2", "bg-success", "bg-success", "bg-late-bar",
  "bg-danger", "bg-success", "bg-success", "bg-success", "bg-success", "bg-success",
];

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5 text-lg font-extrabold", className)}>
      <span className="bg-primary text-on-primary shadow-primary flex size-10 items-center justify-center rounded-[14px] text-lg">
        C
      </span>
      Classroom Edu
    </span>
  );
}

export function HeatmapPreview({ className }: { className?: string }) {
  return (
    <div className={cn("bg-surface border-border rounded-card border p-4 shadow-sm", className)} aria-hidden>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold">Theo dõi lớp 10A1</span>
        <span className="bg-success-soft text-success rounded-full px-2 py-0.5 text-xs font-bold">87% đã nộp</span>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {HEAT.map((c, i) => (
          <span key={i} className={cn("aspect-square rounded-md", c)} />
        ))}
      </div>
      <div className="text-muted mt-3 flex gap-3 text-[11px] font-medium">
        <span className="flex items-center gap-1"><i className="bg-success size-2 rounded-full" />Đúng hạn</span>
        <span className="flex items-center gap-1"><i className="bg-late-bar size-2 rounded-full" />Trễ</span>
        <span className="flex items-center gap-1"><i className="bg-danger size-2 rounded-full" />Chưa nộp</span>
      </div>
    </div>
  );
}

export function AssignmentPreview({ className }: { className?: string }) {
  return (
    <div className={cn("bg-surface border-border rounded-card border p-4 shadow-sm", className)} aria-hidden>
      <div className="flex items-start gap-3">
        <span className="bg-class-sky-bg text-class-sky-fg rounded-tile flex size-10 shrink-0 items-center justify-center text-sm font-extrabold">
          T
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">Bài 3: Hàm số bậc hai</p>
          <p className="text-muted text-xs">Toán 10A1 · hạn 21:00 thứ Sáu</p>
        </div>
        <span className="bg-warning-soft text-warning rounded-full px-2 py-0.5 text-[11px] font-bold">Còn 1 ngày</span>
      </div>
      <div className="bg-surface-2 mt-3 h-2 overflow-hidden rounded-full">
        <div className="bg-progress h-full w-3/4 rounded-full" />
      </div>
      <p className="text-muted mt-1.5 text-[11px]">32/42 học sinh đã nộp</p>
    </div>
  );
}

export function GradePreview({ className }: { className?: string }) {
  return (
    <div className={cn("bg-surface border-border rounded-card border p-4 shadow-sm", className)} aria-hidden>
      <div className="flex items-center gap-3">
        <span className="bg-class-lilac-bg text-class-lilac-fg flex size-9 items-center justify-center rounded-full text-xs font-bold">
          MK
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold">Trần Minh Khoa</p>
          <p className="text-muted text-xs">Đã trả bài · 2 phút trước</p>
        </div>
        <span className="text-success font-mono text-2xl font-bold">8,5</span>
      </div>
      <p className="bg-surface-2 text-muted rounded-control mt-3 px-3 py-2 text-xs">
        “Lời giải gọn, nhớ ghi rõ tập xác định nhé.”
      </p>
    </div>
  );
}
