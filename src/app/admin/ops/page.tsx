import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { opsOverview } from "@/server/services/ops";
import { PageHeader, Panel } from "@/components/domain/page-parts";
import { LatencyChart } from "@/components/admin/latency-chart";
import { shortDateTime } from "@/lib/dates";
import { requestNow } from "@/lib/now";
import { cn } from "@/lib/utils";

export const metadata = { title: "Sức khỏe hệ thống · Quản trị · Classroom Edu" };

const WINDOWS = [
  { h: 1, label: "1 giờ" },
  { h: 24, label: "24 giờ" },
  { h: 168, label: "7 ngày" },
] as const;
const ms = (v: number | null) => (v === null ? "—" : `${Math.round(v).toLocaleString("vi-VN")} ms`);
const CLIENT_LABEL: Record<string, string> = {
  network_error: "Không tới được server",
  offline: "Mất mạng",
  server_error: "Server trả lỗi 5xx",
  slow_request: "Chậm hơn 8 giây",
};
const VITAL_GOOD: Record<string, number> = { LCP: 2500, INP: 200, CLS: 100, TTFB: 800 };

export default async function OpsPage({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const actor = await requireActor("ADMIN");
  const { h: rawH } = await searchParams;
  const h: number = WINDOWS.find((w) => String(w.h) === rawH)?.h ?? 24;
  const o = await opsOverview(actor, h);
  const now = requestNow();
  const errorRate = o.totals.total ? (o.totals.errors5xx / o.totals.total) * 100 : 0;
  const lastCron = o.jobs.find((j) => j.job === "cron");
  const cronStale = !lastCron || now - lastCron.startedAt.getTime() > 26 * 3600_000;
  const fmtT = (d: Date) =>
    d.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", ...(h > 48 ? { day: "2-digit", month: "2-digit" } : { hour: "2-digit", minute: "2-digit" }) });
  const sent = (k: string) => o.email.sentToday.find((s) => s.kind === k)?.count ?? 0;
  const sentTotal = o.email.sentToday.reduce((s, r) => s + r.count, 0);

  return (
    <>
      <PageHeader
        title="Sức khỏe hệ thống"
        description="Số liệu lấy mẫu từ server (thời gian xử lý, lỗi) và từ trình duyệt người dùng (mất request, tốc độ trang)."
        actions={
          <nav aria-label="Khoảng thời gian" className="bg-surface-2 flex rounded-[12px] p-1 text-sm font-semibold">
            {WINDOWS.map((w) => (
              <Link key={w.h} href={`?h=${w.h}`} aria-current={w.h === h ? "page" : undefined} className={cn("rounded-[9px] px-3 py-1.5", w.h === h && "bg-surface shadow-xs")}>
                {w.label}
              </Link>
            ))}
          </nav>
        }
      />

      {(cronStale || errorRate > 2) && (
        <div role="status" className="bg-warning-soft text-warning rounded-card mb-5 flex gap-2 p-4 text-sm font-medium">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            {cronStale && <p>Job định kỳ (/api/cron) chưa chạy trong hơn 26 giờ: nhắc hạn, email và đăng bài hẹn giờ có thể bị trễ. Kiểm tra Cloudflare Worker / Vercel Cron (docs/HANDOVER.md).</p>}
            {errorRate > 2 && <p>Tỉ lệ lỗi 5xx {errorRate.toFixed(1)}% — xem bảng lỗi bên dưới và log Vercel.</p>}
          </div>
        </div>
      )}

      <dl className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["Request (mẫu)", o.totals.total.toLocaleString("vi-VN")],
          ["Lỗi 5xx", `${o.totals.errors5xx} · ${errorRate.toFixed(1)}%`],
          ["p50", ms(o.totals.p50)],
          ["p95", ms(o.totals.p95)],
          ["p99", ms(o.totals.p99)],
        ].map(([l, v]) => (
          <div key={l} className="bg-surface border-border rounded-card border p-4">
            <dd className="text-xl font-extrabold tabular-nums">{v}</dd>
            <dt className="text-muted text-xs font-semibold">{l}</dt>
          </div>
        ))}
      </dl>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Panel title="Độ trễ theo thời gian">
            <LatencyChart points={o.series} label={fmtT} />
          </Panel>
          <Panel title="Route chậm nhất (p95)">
            {o.routes.length === 0 ? (
              <p className="text-muted text-sm">Chưa có số liệu.</p>
            ) : (
              <div className="-mx-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted text-left text-xs">
                    <tr className="border-border border-b">
                      <th scope="col" className="px-5 py-2">Route</th>
                      <th scope="col" className="px-3 py-2 text-right">Số lượt</th>
                      <th scope="col" className="px-3 py-2 text-right">Lỗi</th>
                      <th scope="col" className="px-3 py-2 text-right">p95</th>
                      <th scope="col" className="px-5 py-2 text-right">p99</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {o.routes.map((r) => (
                      <tr key={`${r.method} ${r.route}`}>
                        <td className="px-5 py-2 font-mono text-xs">
                          {r.method} {r.route}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.total}</td>
                        <td className={cn("px-3 py-2 text-right tabular-nums", r.errors > 0 && "text-danger font-bold")}>{r.errors}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{ms(r.p95)}</td>
                        <td className="px-5 py-2 text-right tabular-nums">{ms(r.p99)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          <Panel title={`Lỗi server (${o.errors.reduce((s, e) => s + e.total, 0)})`}>
            {o.errors.length === 0 ? (
              <p className="text-muted text-sm">Không có lỗi trong khoảng này.</p>
            ) : (
              <ul className="divide-border divide-y text-sm">
                {o.errors.map((e, i) => (
                  <li key={i} className="py-2">
                    <p className="font-semibold">
                      {e.message} <span className="text-danger">×{e.total}</span>
                    </p>
                    <p className="text-muted text-xs">
                      <span className="font-mono">{e.route}</span> · {e.routeType}
                      {e.digest ? ` · mã ${e.digest}` : ""} · lần cuối {shortDateTime(e.lastAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Request không tới được server">
            {o.client.length === 0 ? (
              <p className="text-muted text-sm">Không ghi nhận.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {o.client.map((c, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="min-w-0">
                      <span className="font-semibold">{CLIENT_LABEL[c.kind] ?? c.kind}</span>
                      <span className="text-muted block truncate text-xs">
                        <span className="font-mono">{c.route}</span> · mạng {c.network}
                      </span>
                    </span>
                    <b className="tabular-nums">{c.total}</b>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Tốc độ trang thật (p75)">
            {o.vitals.length === 0 ? (
              <p className="text-muted text-sm">Chưa có số liệu.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-muted text-left text-xs">
                  <tr>
                    <th scope="col">Chỉ số</th>
                    <th scope="col">Thiết bị</th>
                    <th scope="col" className="text-right">p75</th>
                  </tr>
                </thead>
                <tbody>
                  {o.vitals.map((v) => {
                    const val = v.p75 ?? 0;
                    const good = val <= (VITAL_GOOD[v.kind] ?? Infinity);
                    return (
                      <tr key={`${v.kind}-${v.device}`}>
                        <td className="py-1 font-semibold">{v.kind}</td>
                        <td className="py-1">{v.device}</td>
                        <td className={cn("py-1 text-right tabular-nums", good ? "text-success" : "text-danger")}>
                          {v.kind === "CLS" ? (val / 1000).toFixed(2) : `${Math.round(val)} ms`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Panel>
          <Panel title="Job định kỳ">
            {o.jobs.length === 0 ? (
              <p className="text-muted text-sm">Chưa có lần chạy nào được ghi.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {o.jobs.slice(0, 6).map((j, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>
                      {j.job} · {shortDateTime(j.startedAt)}
                    </span>
                    <b className={j.ok ? "text-success" : "text-danger"}>{j.ok ? "OK" : "Lỗi"}</b>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Email & thông báo">
            <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-sm">
              <dt className="text-muted">Đã gửi hôm nay</dt>
              <dd className="font-semibold tabular-nums">
                {sentTotal}
                {o.email.limits.total ? ` / ${o.email.limits.total}` : ""}
              </dd>
              <dt className="text-muted">· nhắc việc / giao dịch / admin</dt>
              <dd className="tabular-nums">
                {sent("reminder")} / {sent("transactional")} / {sent("admin")}
              </dd>
              <dt className="text-muted">Thông báo chờ gửi email</dt>
              <dd className="tabular-nums">{o.email.queue}</dd>
              <dt className="text-muted">Thiết bị nhận Web Push</dt>
              <dd className="tabular-nums">{o.pushDevices}</dd>
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
