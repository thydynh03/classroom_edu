import Link from "next/link";
import { Star } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { studentOverview } from "@/server/services/submissions";
import { ClassChip } from "@/components/domain/class-chip";
import { EmptyState, PageHeader } from "@/components/domain/page-parts";
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
  return (
    <>
      <PageHeader title="Điểm" description="Điểm và nhận xét giáo viên đã trả" />
      {items.length === 0 ? (
        <EmptyState icon={<Star className="size-6" />} title="Chưa có điểm" description="Khi giáo viên trả bài, điểm sẽ hiện ở đây." />
      ) : (
        <>
          <ul className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...bySubject.entries()].map(([subject, s]) => (
              <li key={subject} className="bg-surface border-border rounded-card border p-4">
                <p className="text-muted text-xs font-semibold">{subject} · TB thang 10</p>
                <p className="text-2xl font-extrabold tabular-nums">{formatScore(Math.round((s.sum / s.n) * 100) / 100)}</p>
                <p className="text-muted text-xs">{s.n} bài</p>
              </li>
            ))}
          </ul>
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
