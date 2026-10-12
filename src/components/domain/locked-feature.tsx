import { Lock, Sparkles } from "lucide-react";
import { featureByKey, type FeatureKey } from "@/lib/premium-features";
import { LinkButton } from "./page-parts";

/** Hiện thay cho nội dung tính năng nâng cao khi GV chưa mở khóa: mô tả + đường tới trang Nâng cao. */
export function LockedFeature({ feature }: { feature: FeatureKey }) {
  const f = featureByKey(feature);
  if (!f) return null;
  return (
    <section className="bg-surface border-border rounded-card border border-dashed p-6 text-center">
      <span className="bg-primary-soft text-primary mx-auto flex size-12 items-center justify-center rounded-full" aria-hidden="true">
        <Lock className="size-5" />
      </span>
      <h2 className="mt-3 text-lg font-extrabold tracking-tight">{f.title}</h2>
      <p className="text-muted mx-auto mt-1 max-w-md text-sm">{f.summary}</p>
      <ul className="text-muted mx-auto mt-3 max-w-md space-y-1 text-left text-sm">
        {f.benefits.map((b) => (
          <li key={b}>• {b}</li>
        ))}
      </ul>
      <LinkButton href={`/teacher/upgrade?feature=${f.key}#${f.key}`} className="mt-4">
        <Sparkles aria-hidden="true" /> Xem và yêu cầu mở khóa
      </LinkButton>
    </section>
  );
}
