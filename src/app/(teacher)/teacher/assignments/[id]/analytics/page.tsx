import { notFound } from "next/navigation";
import { requireActor } from "@/server/auth/guard";
import { requireAssignmentForTeacher } from "@/server/policy";
import { hasFeature } from "@/server/entitlements";
import { quizAnalytics } from "@/server/services/gradebook";
import { PageHeader, Panel } from "@/components/domain/page-parts";
import { LockedFeature } from "@/components/domain/locked-feature";
import { cn } from "@/lib/utils";

export const metadata = { title: "Thống kê câu hỏi · Classroom Edu" };

const pct = (r: number | null) => (r === null ? "—" : `${Math.round(r * 100)}%`);

export default async function QuizAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor("TEACHER");
  const { id } = await params;
  const { a } = await requireAssignmentForTeacher(actor, id);
  if (a.type !== "QUIZ") notFound();
  const header = <PageHeader title="Thống kê từng câu" description={a.title} back={{ href: `/teacher/assignments/${a.id}`, label: a.title }} />;
  if (!(await hasFeature(actor, "QUIZ_ANALYTICS")))
    return (
      <>
        {header}
        <LockedFeature feature="QUIZ_ANALYTICS" />
      </>
    );
  const st = await quizAnalytics(actor, id);
  const maxBucket = Math.max(1, ...st.buckets);
  return (
    <>
      {header}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="Từng câu hỏi" className="space-y-4">
          {st.submitted === 0 && <p className="text-muted bg-surface border-border rounded-card border border-dashed p-6 text-center text-sm">Chưa có học sinh nộp bài.</p>}
          {st.questions.map((q, i) => {
            const hard = q.rate !== null && q.rate < 0.5;
            return (
              <article key={q.id} className="bg-surface border-border rounded-card border p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="font-bold">
                    <span className="text-muted mr-1 text-sm">Câu {i + 1}.</span> {q.prompt}
                  </h2>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", hard ? "bg-danger-soft text-danger" : "bg-success-soft text-success")}>
                    {pct(q.rate)} đúng
                  </span>
                </div>
                <ul className="mt-3 space-y-2">
                  {q.options.map((o) => {
                    const share = st.submitted ? o.picked / st.submitted : 0;
                    return (
                      <li key={o.id} className="text-sm">
                        <div className="flex justify-between gap-2">
                          <span className={cn(o.isCorrect && "text-success font-semibold")}>
                            {o.isCorrect ? "✓ " : ""}
                            {o.label}
                          </span>
                          <span className="text-muted tabular-nums">
                            {o.picked} em · {Math.round(share * 100)}%
                          </span>
                        </div>
                        <div className="bg-surface-2 mt-1 h-2 overflow-hidden rounded-full" aria-hidden="true">
                          <div className={cn("h-full rounded-full", o.isCorrect ? "bg-success" : "bg-muted/40")} style={{ width: `${share * 100}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-muted mt-2 text-xs">
                  {q.answered}/{st.submitted} em trả lời câu này
                </p>
              </article>
            );
          })}
        </section>
        <Panel title="Tổng quan" className="h-fit">
          <dl className="mb-4 grid grid-cols-2 gap-3 text-center">
            <div>
              <dd className="text-2xl font-extrabold tabular-nums">{st.submitted}</dd>
              <dt className="text-muted text-xs">Bài đã nộp</dt>
            </div>
            <div>
              <dd className="text-2xl font-extrabold tabular-nums">{st.average10?.toLocaleString("vi-VN", { maximumFractionDigits: 1 }) ?? "—"}</dd>
              <dt className="text-muted text-xs">Điểm TB (thang 10)</dt>
            </div>
          </dl>
          <h3 className="mb-2 text-sm font-bold">Phổ điểm</h3>
          <ol className="space-y-1" aria-label="Số bài theo khoảng điểm">
            {st.buckets.map((n, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <span className="text-muted w-12 shrink-0 tabular-nums">
                  {i}–{i + 1}
                </span>
                <span className="bg-surface-2 h-3 flex-1 overflow-hidden rounded-full" aria-hidden="true">
                  <span className="bg-primary block h-full rounded-full" style={{ width: `${(n / maxBucket) * 100}%` }} />
                </span>
                <span className="w-6 text-right tabular-nums">{n}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}
