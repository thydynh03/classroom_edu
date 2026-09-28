import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { gradingQueue } from "@/server/services/submissions";
import { ClassChip } from "@/components/domain/class-chip";
import { EmptyState, PageHeader } from "@/components/domain/page-parts";
import { dueLabel, durationVN } from "@/lib/dates";
import { requestNow } from "@/lib/now";

export const metadata = { title: "Cần chấm · Classroom Edu" };

export default async function GradingQueuePage() {
  const actor = await requireActor("TEACHER");
  const queue = await gradingQueue(actor);
  const total = queue.reduce((s, q) => s + q.pending, 0);
  return (
    <>
      <PageHeader title="Cần chấm" description={total ? `${total} bài đang chờ, xếp theo bài chờ lâu nhất` : undefined} />
      {queue.length === 0 ? (
        <EmptyState icon={<CheckCircle2 className="size-6" />} title="Không còn bài nào chờ chấm" description="Bài học sinh nộp sẽ xuất hiện ở đây." />
      ) : (
        <ul className="bg-surface border-border rounded-card divide-border divide-y overflow-hidden border">
          {queue.map((q) => (
            <li key={q.assignmentId}>
              <Link href={`/teacher/grading/${q.assignmentId}`} className="hover:bg-surface-2 flex items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{q.title}</p>
                  <p className="text-muted mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <ClassChip color={q.classColor}>{q.className}</ClassChip>
                    hạn {dueLabel(q.dueAt)}
                    {q.oldest && <> · chờ lâu nhất {durationVN(requestNow() - new Date(q.oldest).getTime())}</>}
                  </p>
                </div>
                <span className="bg-primary-soft text-primary rounded-full px-3 py-1 text-sm font-extrabold tabular-nums">{q.pending}</span>
                <ChevronRight className="text-muted size-5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
