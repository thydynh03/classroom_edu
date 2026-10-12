import { requireActor } from "@/server/auth/guard";
import { listActiveGrants, listUpgradeRequests } from "@/server/services/upgrades";
import { PageHeader } from "@/components/domain/page-parts";
import { featureByKey, PLANS, PREMIUM_FEATURES, type PlanKey } from "@/lib/premium-features";
import { shortDateTime } from "@/lib/dates";
import { GrantForm, RequestActions, RevokeButton } from "./upgrade-admin";

export const metadata = { title: "Yêu cầu nâng cấp · Quản trị · Classroom Edu" };

const STATUS = { NEW: "Mới", CONTACTED: "Đã liên hệ", GRANTED: "Đã mở khóa", REJECTED: "Từ chối", CANCELLED: "GV đã hủy" } as const;

export default async function AdminUpgradesPage() {
  const actor = await requireActor("ADMIN");
  const [requests, grants] = await Promise.all([listUpgradeRequests(actor), listActiveGrants(actor)]);
  const open = requests.filter((r) => r.status === "NEW" || r.status === "CONTACTED");
  const done = requests.filter((r) => !(r.status === "NEW" || r.status === "CONTACTED")).slice(0, 50);
  const sellable = PREMIUM_FEATURES.filter((f) => !f.comingSoon).map((f) => ({ key: f.key, title: f.title }));

  return (
    <>
      <PageHeader title="Yêu cầu nâng cấp" description="Giáo viên gửi yêu cầu mở khóa tính năng nâng cao. Liên hệ, nhận thanh toán rồi bấm Mở khóa." />

      <section aria-labelledby="open-title" className="mb-8">
        <h2 id="open-title" className="mb-3 text-[15px] font-bold">Đang chờ xử lý ({open.length})</h2>
        {open.length === 0 ? (
          <p className="text-muted bg-surface border-border rounded-card border border-dashed p-6 text-center text-sm">Không có yêu cầu nào đang chờ.</p>
        ) : (
          <ul className="space-y-3">
            {open.map((r) => {
              const f = featureByKey(r.featureKey);
              return (
                <li key={r.id} className="bg-surface border-border rounded-card border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold">{f?.title ?? r.featureKey}</p>
                      <p className="text-muted text-sm">
                        {r.teacherName} · <span className="font-mono">{r.username}</span>
                        {r.email ? ` · ${r.email}` : ""}
                      </p>
                      <p className="text-muted text-xs">
                        {PLANS[r.plan as PlanKey] ?? r.plan} · {shortDateTime(r.createdAt)} · {STATUS[r.status]}
                      </p>
                      {r.contact && <p className="mt-1 text-sm">Liên hệ: {r.contact}</p>}
                      {r.note && <p className="mt-1 text-sm whitespace-pre-line">Ghi chú: {r.note}</p>}
                      {r.adminNote && <p className="text-muted mt-1 text-sm">Admin: {r.adminNote}</p>}
                    </div>
                    <RequestActions id={r.id} status={r.status} featureKey={r.featureKey} canGrant={!!f && !f.comingSoon} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="grants-title" className="bg-surface border-border rounded-card border p-5">
          <h2 id="grants-title" className="mb-3 text-[15px] font-bold">Đang được dùng ({grants.length})</h2>
          {grants.length === 0 ? (
            <p className="text-muted text-sm">Chưa có giáo viên nào được mở khóa.</p>
          ) : (
            <ul className="divide-border divide-y">
              {grants.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{featureByKey(g.featureKey)?.title ?? g.featureKey}</p>
                    <p className="text-muted truncate text-xs">
                      {g.teacherName} · <span className="font-mono">{g.username}</span> · {g.expiresAt ? `đến ${shortDateTime(g.expiresAt)}` : "không thời hạn"}
                    </p>
                  </div>
                  <RevokeButton id={g.id} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="grant-title" className="bg-surface border-border rounded-card h-fit border p-5">
          <h2 id="grant-title" className="mb-1 text-[15px] font-bold">Mở khóa trực tiếp</h2>
          <p className="text-muted mb-3 text-sm">Cho giáo viên đã thanh toán ngoài hệ thống. Gia hạn thì cộng tiếp từ ngày hết hạn hiện tại.</p>
          <GrantForm features={sellable} />
        </section>
      </div>

      {done.length > 0 && (
        <section aria-labelledby="done-title" className="mt-8">
          <h2 id="done-title" className="mb-3 text-[15px] font-bold">Đã xử lý gần đây</h2>
          <ul className="bg-surface border-border rounded-card divide-border divide-y border text-sm">
            {done.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
                <span>
                  {featureByKey(r.featureKey)?.title ?? r.featureKey} · {r.teacherName}
                </span>
                <span className="text-muted">
                  {STATUS[r.status]} · {r.handledAt ? shortDateTime(r.handledAt) : shortDateTime(r.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
