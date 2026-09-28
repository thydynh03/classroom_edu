"use client";

import { useTransition } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { archiveClassAction, regenerateCodeAction, toggleJoinAction, updateClassAction } from "../../actions";
import { ClassForm } from "../class-form";
import type { ClassColor } from "@/components/domain/class-chip";

export function SettingsPanel({
  cls,
  joinUrl,
}: {
  cls: { id: string; name: string; subject: string; schoolYear: string | null; color: ClassColor; joinCode: string; joinEnabled: boolean; status: "ACTIVE" | "ARCHIVED" };
  joinUrl: string;
}) {
  const [pending, start] = useTransition();
  const copy = (t: string) =>
    navigator.clipboard.writeText(t).then(
      () => toast.success("Đã sao chép"),
      () => toast.error("Không sao chép được, hãy chọn và sao chép thủ công"),
    );
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="bg-surface border-border rounded-card border p-5">
        <h2 className="mb-1 text-[15px] font-bold">Mã tham gia lớp</h2>
        <p className="text-muted mb-4 text-sm">
          Học sinh vào đường link hoặc nhập mã để tự tạo tài khoản và tham gia lớp.
        </p>
        <p className="bg-surface-2 rounded-control mb-3 px-4 py-3 text-center font-mono text-3xl font-medium tracking-[0.2em]" aria-label={`Mã lớp ${cls.joinCode.split("").join(" ")}`}>
          {cls.joinEnabled ? cls.joinCode : "Đã tắt"}
        </p>
        <p className="text-muted mb-4 truncate text-xs select-all">{joinUrl}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => copy(joinUrl)} disabled={!cls.joinEnabled}>
            <Copy aria-hidden="true" /> Sao chép link
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => start(() => regenerateCodeAction(cls.id))}>
            <RefreshCw aria-hidden="true" /> Đổi mã mới
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(() => toggleJoinAction(cls.id, !cls.joinEnabled))}>
            {cls.joinEnabled ? "Tắt tham gia bằng mã" : "Bật tham gia bằng mã"}
          </Button>
        </div>
      </section>

      <section className="bg-surface border-border rounded-card border p-5">
        <h2 className="mb-4 text-[15px] font-bold">Thông tin lớp</h2>
        <ClassForm action={updateClassAction.bind(null, cls.id)} initial={cls} submitLabel="Lưu thay đổi" />
        <div className="border-border mt-6 border-t pt-4">
          <Button variant="outline" size="sm" disabled={pending} onClick={() => start(() => archiveClassAction(cls.id, cls.status === "ACTIVE"))}>
            {cls.status === "ACTIVE" ? "Lưu trữ lớp (kết thúc năm học)" : "Khôi phục lớp"}
          </Button>
        </div>
      </section>
    </div>
  );
}
