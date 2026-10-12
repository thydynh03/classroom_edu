import { CheckCircle2, Clock, Lock, Sparkles } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { getBilling, myUpgradeState } from "@/server/services/upgrades";
import { PageHeader } from "@/components/domain/page-parts";
import { PREMIUM_FEATURES } from "@/lib/premium-features";
import { cn } from "@/lib/utils";
import { CancelRequestButton, RequestUpgradeDialog } from "./upgrade-actions";
import { track } from "@/server/observability/events";

export const metadata = { title: "Nâng cao · Classroom Edu" };

const dateVN = (d: Date) => d.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

export default async function UpgradePage({ searchParams }: { searchParams: Promise<{ feature?: string }> }) {
  const actor = await requireActor("TEACHER");
  const { feature: focus } = await searchParams;
  const [{ requests, grants }, billing] = await Promise.all([myUpgradeState(actor), getBilling()]);
  await track(actor, "upgrade.view", focus ? { feature: focus.slice(0, 40) } : undefined);

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="bg-primary-soft text-primary inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold">
            <Sparkles className="size-3.5" aria-hidden="true" /> Nâng cao
          </span>
        }
        title="Tính năng nâng cao"
        description="Mở khóa cho riêng tài khoản của bạn. Gửi yêu cầu, quản trị viên sẽ liên hệ để hoàn tất thanh toán và mở khóa."
      />
      <section className="bg-surface border-border rounded-card mb-6 border p-4 text-sm" aria-label="Giá và thanh toán">
        <p className="font-bold">{billing.priceText}</p>
        {billing.paymentInfo && <p className="text-muted mt-1 whitespace-pre-line">{billing.paymentInfo}</p>}
      </section>
      <ul className="grid gap-4 md:grid-cols-2">
        {PREMIUM_FEATURES.map((f) => {
          const grant = grants.find((g) => g.featureKey === f.key);
          const request = requests.find((r) => r.featureKey === f.key);
          return (
            <li
              key={f.key}
              id={f.key}
              className={cn(
                "bg-surface border-border rounded-card flex flex-col border p-5",
                focus === f.key && "ring-primary ring-2",
                f.comingSoon && "opacity-90",
              )}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {grant ? (
                  <span className="bg-success-soft text-success inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold">
                    <CheckCircle2 className="size-3.5" aria-hidden="true" /> Đã mở khóa{grant.expiresAt ? ` đến ${dateVN(grant.expiresAt)}` : ""}
                  </span>
                ) : request ? (
                  <span className="bg-info-soft text-info inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold">
                    <Clock className="size-3.5" aria-hidden="true" /> Đã gửi yêu cầu {dateVN(request.createdAt)}
                  </span>
                ) : f.comingSoon ? (
                  <span className="bg-surface-2 text-muted rounded-full px-2.5 py-0.5 text-xs font-bold">Sắp ra mắt</span>
                ) : (
                  <span className="bg-surface-2 text-muted inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold">
                    <Lock className="size-3.5" aria-hidden="true" /> Chưa mở khóa
                  </span>
                )}
              </div>
              <h2 className="text-lg font-extrabold tracking-tight">{f.title}</h2>
              <p className="text-muted mt-1 text-sm">{f.summary}</p>
              <ul className="mt-3 flex-1 space-y-1.5 text-sm">
                {f.benefits.map((b) => (
                  <li key={b} className="flex gap-2">
                    <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {b}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                {grant ? null : request ? (
                  <CancelRequestButton featureKey={f.key} />
                ) : (
                  <RequestUpgradeDialog featureKey={f.key} title={f.title} comingSoon={!!f.comingSoon} />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
