import Link from "next/link";
import { Star } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { studentOverview } from "@/server/services/submissions";
import { ClassChip } from "@/components/domain/class-chip";
import { EmptyState, PageHeader, Panel, SummaryStrip } from "@/components/domain/page-parts";
import { shortDateTime } from "@/lib/dates";
import { formatScore } from "@/lib/format";

export const metadata = { title: "Điểm · Classroom Edu" };

export default async function GradesPage() {
  const actor = await requireActor("STUDENT");
  const items = (await studentOverview(actor))
    .filter((i) => i.resultsVisible && i.score !== null)
    .sort((a, b) => (b.returnedAt ?? b.submittedAt ?? b.dueAt).getTime() - (a.returnedAt ?? a.submittedAt ?? a.dueAt).getTime());
  const bySubject = new Map<string, { sum: number; n: number }>();
  items.forEach((i) => {
    const pct = (i.score! / i.maxPoints) * 10;
    const s = bySubject.get(i.subject) ?? { sum: 0, n: 0 };
    bySubject.set(i.subject, { sum: s.sum + pct, n: s.n + 1 });
  });
  const on10 = (i: (typeof items)[number]) => (i.score! / i.maxPoints) * 10;
  const round1 = (v: number) => formatScore(Math.round(v * 10) / 10);
  const avg = items.length ? items.reduce((s, i) => s + on10(i), 0) / items.length : 0;
  const best = items.reduce<(typeof items)[number] | null>((b, i) => (!b || on10(i) > on10(b) ? i : b), null);
  // 12 bài gần nhất, cũ → mới, để nhìn xu hướng.
  const trend = items.slice(0, 12).reverse();
  return (
    <>
      <PageHeader title="Điểm" description="Điểm và nhận xét giáo viên đã trả" />
      {items.length === 0 ? (
        <EmptyState icon={<Star className="size-6" />} title="Chưa có điểm" description="Khi giáo viên trả bài, điểm sẽ hiện ở đây." />
      ) : (
        <>
          <SummaryStrip
            items={[
              { label: "Điểm trung bình (thang 10)", value: round1(avg), tone: "primary" },
              { label: "Bài đã có điểm", value: items.length },
              { label: "Điểm cao nhất", value: best ? round1(on10(best)) : "—", hint: best?.title, tone: "success" },
            ]}
          />
          {trend.length >= 2 && (
            <Panel title={`Điểm ${trend.length} bài gần nhất (thang 10)`} className="mb-6">
              <ol className="flex h-40 items-end gap-2" aria-label="Điểm các bài gần nhất, từ cũ đến mới">
                {trend.map((i) => {
                  const v = on10(i);
                  return (
                    <li key={i.id} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${i.title}: ${round1(v)}`}>
                      <span className="text-xs font-bold tabular-nums">{round1(v)}</span>
                      <span className="bg-primary w-full max-w-10 rounded-t-[6px]" style={{ height: `${Math.max(v * 10, 2)}%` }} aria-hidden="true" />
                      <span className="text-muted w-full truncate text-center text-[11px]">{i.returnedAt ? shortDateTime(i.returnedAt).slice(0, 5) : i.subject}</span>
                    </li>
                  );
                })}
              </ol>
            </Panel>
          )}
          <h2 className="mb-3 text-[15px] font-bold">Theo môn</h2>
          <ul className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...bySubject.entries()].map(([subject, s]) => (
              <li key={subject} className="bg-surface border-border rounded-card border p-4">
                <p className="text-muted text-xs font-semibold">{subject} · TB thang 10</p>
                <p className="text-2xl font-extrabold tabular-nums">{formatScore(Math.round((s.sum / s.n) * 100) / 100)}</p>
                <p className="text-muted text-xs">{s.n} bài</p>
              </li>
            ))}
          </ul>
          <h2 className="mb-3 text-[15px] font-bold">Tất cả bài đã có điểm</h2>
          <ul className="bg-surface border-border rounded-card divide-border divide-y overflow-hidden border">
            {items.map((i) => (
              <li key={i.id}>
                <Link href={`/student/assignments/${i.id}`} className="hover:bg-surface-2 flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{i.title}</p>
                    <p className="text-muted mt-0.5 flex items-center gap-2 text-xs">
                      <ClassChip color={i.color}>{i.subject}</ClassChip>
                      {i.returnedAt ? `trả ${shortDateTime(i.returnedAt)}` : ""}
                    </p>
                  </div>
                  <p className="text-success text-lg font-extrabold tabular-nums">
                    {formatScore(i.score!)}
                    <span className="text-muted text-xs font-semibold">/{formatScore(i.maxPoints)}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
