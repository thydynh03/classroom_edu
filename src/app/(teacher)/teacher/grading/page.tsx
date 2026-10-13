import Link from "next/link";
import { CheckCircle2, ChevronRight, ClipboardList } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { gradingQueue } from "@/server/services/submissions";
import { listTeacherAssignments } from "@/server/services/assignments";
import { AssignmentRow } from "@/components/domain/assignment-row";
import { ClassChip } from "@/components/domain/class-chip";
import { EmptyHint, EmptyState, LinkButton, PageHeader, SummaryStrip } from "@/components/domain/page-parts";
import { dueLabel, durationVN } from "@/lib/dates";
import { requestNow } from "@/lib/now";

export const metadata = { title: "Cần chấm · Classroom Edu" };

export default async function GradingQueuePage() {
  const actor = await requireActor("TEACHER");
  const [queue, open] = await Promise.all([gradingQueue(actor), listTeacherAssignments(actor, { status: "PUBLISHED" })]);
  const now = requestNow();
  const total = queue.reduce((s, q) => s + q.pending, 0);
  const oldest = queue.find((q) => q.oldest)?.oldest;
  const queued = new Set(queue.map((q) => q.assignmentId));
  // Bài đang mở chưa có bài nào chờ chấm: hạn gần nhất lên trước.
  const waiting = open
    .filter((a) => !queued.has(a.id))
    .sort((a, b) => Math.abs(a.dueAt.getTime() - now) - Math.abs(b.dueAt.getTime() - now))
    .slice(0, 6);
  const missing = open.reduce((s, a) => s + a.stats.missing, 0);
  const graded = open.reduce((s, a) => s + a.stats.graded, 0);
  return (
    <>
      <PageHeader title="Cần chấm" description={total ? `${total} bài đang chờ, xếp theo bài chờ lâu nhất` : "Bài học sinh nộp sẽ xuất hiện ở đây."} />
      <SummaryStrip
        items={[
          { label: "Bài chờ chấm", value: total, hint: queue.length ? `ở ${queue.length} bài tập` : "Đã chấm hết", tone: total ? "primary" : "success" },
          { label: "Chờ lâu nhất", value: oldest ? durationVN(now - new Date(oldest).getTime()) : "—", hint: oldest ? "tính từ lúc học sinh nộp" : undefined },
          { label: "Đã chấm", value: graded, hint: "trong các bài đang mở" },
          { label: "Chưa nộp", value: missing, hint: "trong các bài đang mở", tone: missing ? "warning" : "default" },
        ]}
      />
      {queue.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="size-6" />}
          title="Không còn bài nào chờ chấm"
          description={open.length ? "Các bài đang mở ở bên dưới sẽ chuyển lên đây khi có học sinh nộp." : "Giao một bài tập để bắt đầu nhận bài nộp."}
          action={open.length ? undefined : <LinkButton href="/teacher/assignments/new">Giao bài</LinkButton>}
        />
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
                    {q.oldest && <> · chờ lâu nhất {durationVN(now - new Date(q.oldest).getTime())}</>}
                  </p>
                </div>
                <span className="bg-primary-soft text-primary rounded-full px-3 py-1 text-sm font-extrabold tabular-nums">{q.pending}</span>
                <ChevronRight className="text-muted size-5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold">Bài đang mở, chưa có bài chờ chấm</h2>
          <Link href="/teacher/assignments" className="text-primary text-sm font-semibold hover:underline">
            Tất cả bài tập
          </Link>
        </div>
        {waiting.length === 0 ? (
          <EmptyHint icon={<ClipboardList />}>{open.length ? "Mọi bài đang mở đều có bài chờ chấm ở trên." : "Chưa có bài tập nào đang mở."}</EmptyHint>
        ) : (
          <div className="bg-surface border-border rounded-card divide-border divide-y overflow-hidden border">
            {waiting.map((a) => (
              <AssignmentRow key={a.id} a={a} className={a.className} classColor={a.classColor} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
