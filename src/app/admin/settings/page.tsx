import { AlertTriangle, CheckCircle2, Database } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { getKeepalive, KEEPALIVE_MAX_HOURS, KEEPALIVE_MIN_HOURS, nextKeepaliveAt } from "@/server/services/settings";
import { PageHeader } from "@/components/domain/page-parts";
import { shortDateTime } from "@/lib/dates";
import { requestNow } from "@/lib/now";
import { KeepaliveForm } from "./keepalive-form";

export const metadata = { title: "Cài đặt · Quản trị · Classroom Edu" };

export default async function AdminSettingsPage() {
  await requireActor("ADMIN");
  const s = await getKeepalive();
  const now = requestNow();
  const next = nextKeepaliveAt(s);
  // Lần ping cuối đã quá 2 chu kỳ: lịch gọi từ bên ngoài (cron) có lẽ không chạy.
  const stale = s.enabled && (!s.lastPingAt || now - new Date(s.lastPingAt).getTime() > 2 * s.intervalHours * 3600_000);

  return (
    <>
      <PageHeader title="Cài đặt hệ thống" />
      <section aria-labelledby="keepalive-title" className="bg-surface border-border rounded-card max-w-2xl border p-5">
        <h2 id="keepalive-title" className="flex items-center gap-2 text-[15px] font-bold">
          <Database className="text-muted size-4" aria-hidden="true" /> Giữ database luôn hoạt động
        </h2>
        <p className="text-muted mt-1 text-sm leading-relaxed">
          Supabase gói miễn phí tự tạm dừng database khi lâu không có hoạt động (khoảng 7 ngày). Bật mục này để hệ thống tự gửi một truy
          vấn nhỏ vào database theo chu kỳ bạn chọn ({KEEPALIVE_MIN_HOURS}–{KEEPALIVE_MAX_HOURS} giờ). Gói trả phí không cần bật.
        </p>

        <dl className="bg-surface-2 rounded-tile mt-4 grid grid-cols-[140px_1fr] gap-y-1.5 p-3 text-sm">
          <dt className="text-muted">Lần ping cuối</dt>
          <dd className="flex items-center gap-1.5 font-semibold">
            {s.lastPingAt ? (
              <>
                {s.lastOk ? (
                  <CheckCircle2 className="text-success size-4" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="text-danger size-4" aria-hidden="true" />
                )}
                {shortDateTime(new Date(s.lastPingAt))} · {s.lastOk ? "thành công" : "thất bại"}
              </>
            ) : (
              "Chưa có"
            )}
          </dd>
          <dt className="text-muted">Lần kế tiếp</dt>
          <dd className="font-semibold">{!next ? "Đang tắt" : next.getTime() <= now ? "Ở lần gọi định kỳ tới" : `Từ ${shortDateTime(next)}`}</dd>
        </dl>

        {stale && (
          <p role="status" className="bg-warning-soft text-warning rounded-control mt-3 flex gap-2 px-3 py-2 text-sm font-medium">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Đã lâu chưa có lần ping nào. Hệ thống chỉ ping khi có lịch gọi định kỳ tới /api/keepalive hoặc /api/cron (Vercel Cron, Cloudflare
            Workers Cron hoặc cron-job.org). Xem hướng dẫn trong docs/HANDOVER.md, hoặc bấm “Ping ngay”.
          </p>
        )}

        <KeepaliveForm enabled={s.enabled} intervalHours={s.intervalHours} min={KEEPALIVE_MIN_HOURS} max={KEEPALIVE_MAX_HOURS} />
      </section>
    </>
  );
}
