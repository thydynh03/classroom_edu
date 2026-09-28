import Link from "next/link";
import { ListChecks, Pencil } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { attachmentsOf, questionsWithOptions } from "@/server/services/assignments";
import { assignmentRoster } from "@/server/services/submissions";
import { ClassChip } from "@/components/domain/class-chip";
import { SubmissionStatusBadge } from "@/components/domain/submission-status-badge";
import { SegmentedProgress } from "@/components/domain/segmented-progress";
import { FileList } from "@/components/domain/file-uploader";
import { LinkButton, PageHeader, Panel } from "@/components/domain/page-parts";
import { dueLabel, shortDateTime } from "@/lib/dates";
import { formatScore } from "@/lib/format";
import { requestNow } from "@/lib/now";
import { ArchiveButton, DeleteDraftButton, PublishButton, ReturnAllButton, ScheduleControl } from "./assignment-actions";
import { toLocalInputValue } from "@/lib/dates";

export default async function TeacherAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor("TEACHER");
  const { id } = await params;
  const { a, cls, roster } = await assignmentRoster(actor, id);
  const [attachments, questions] = await Promise.all([
    attachmentsOf(a.id),
    a.type === "QUIZ" ? questionsWithOptions(a.id, true) : Promise.resolve([]),
  ]);
  const count = (f: (r: (typeof roster)[number]) => boolean) => roster.filter(f).length;
  const submitted = count((r) => !!r.status && r.status !== "DRAFT");
  const graded = count((r) => r.status === "GRADED" || r.status === "RETURNED");
  const gradedNotReturned = count((r) => r.status === "GRADED");
  const late = count((r) => r.isLate && r.status !== "DRAFT" && !!r.status);
  const pending = submitted - graded;

  return (
    <>
      <PageHeader
        back={{ href: `/teacher/classes/${cls.id}`, label: cls.name }}
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <ClassChip color={cls.color}>{cls.name}</ClassChip>
            <span className="text-muted text-xs font-semibold">
              {a.type === "QUIZ" ? "Trắc nghiệm" : "Tự luận"} · {formatScore(a.maxPoints)} điểm · hạn {dueLabel(a.dueAt)}
            </span>
            {a.status !== "PUBLISHED" && (
              <span className="bg-surface-2 text-muted rounded-full px-2.5 py-0.5 text-xs font-bold">
                {a.status === "DRAFT" ? "Nháp · học sinh chưa thấy" : a.status === "SCHEDULED" ? "Đã lên lịch" : "Đã lưu trữ"}
              </span>
            )}
          </div>
        }
        title={a.title}
        actions={
          <>
            {(a.status === "DRAFT" || a.status === "SCHEDULED") && <PublishButton id={a.id} />}
            {a.type === "QUIZ" && (
              <LinkButton href={`/teacher/assignments/${a.id}/questions`} variant="outline">
                <ListChecks aria-hidden="true" /> Câu hỏi ({questions.length})
              </LinkButton>
            )}
            <LinkButton href={`/teacher/assignments/${a.id}/edit`} variant="outline">
              <Pencil aria-hidden="true" /> Sửa
            </LinkButton>
            {a.status === "DRAFT" ? <DeleteDraftButton id={a.id} /> : <ArchiveButton id={a.id} archived={a.status === "ARCHIVED"} />}
          </>
        }
      />

      {(a.status === "DRAFT" || a.status === "SCHEDULED") && (
        <div className="mb-5">
          <ScheduleControl
            id={a.id}
            scheduledLabel={a.status === "SCHEDULED" && a.publishAt ? dueLabel(a.publishAt) : undefined}
            defaultValue={toLocalInputValue(new Date(Math.min(a.dueAt.getTime() - 3600_000, requestNow() + 86400_000)))}
          />
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          title={`Học sinh (${roster.length})`}
          action={
            <div className="flex gap-2">
              {pending > 0 && a.type === "WRITTEN" && (
                <LinkButton href={`/teacher/grading/${a.id}`} className="h-8 px-3 text-xs">
                  Chấm {pending} bài
                </LinkButton>
              )}
              {gradedNotReturned > 0 && <ReturnAllButton id={a.id} count={gradedNotReturned} />}
            </div>
          }
        >
          {roster.length === 0 ? (
            <p className="text-muted text-sm">Lớp chưa có học sinh.</p>
          ) : (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted text-left text-xs">
                  <tr className="border-border border-b">
                    <th scope="col" className="px-5 py-2 font-semibold">Học sinh</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Trạng thái</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Nộp lúc</th>
                    <th scope="col" className="px-5 py-2 text-right font-semibold">Điểm</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {roster.map((r) => (
                    <tr key={r.studentId} className="hover:bg-surface-2">
                      <td className="px-5 py-2.5 font-medium">
                        {r.submissionId && r.status !== "DRAFT" ? (
                          <Link href={`/teacher/grading/${a.id}?s=${r.submissionId}`} className="hover:underline">
                            {r.fullName}
                          </Link>
                        ) : (
                          r.fullName
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <SubmissionStatusBadge status={r.display} />
                      </td>
                      <td className="text-muted px-3 py-2.5 tabular-nums">{r.submittedAt && r.status !== "DRAFT" ? shortDateTime(r.submittedAt) : "—"}</td>
                      <td className="px-5 py-2.5 text-right font-bold tabular-nums">{r.score !== null ? formatScore(r.score) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="Tiến độ">
            <dl className="mb-4 grid grid-cols-3 gap-3 text-center">
              <Stat label="Đã nộp" value={`${submitted}/${roster.length}`} />
              <Stat label="Chờ chấm" value={pending} />
              <Stat label="Nộp trễ" value={late} />
            </dl>
            <SegmentedProgress graded={graded} pending={pending} late={0} missing={roster.length - submitted} total={roster.length} showLegend />
          </Panel>
          {(a.body || attachments.length > 0) && (
            <Panel title={a.type === "QUIZ" ? "Hướng dẫn" : "Đề bài"}>
              {a.body && <p className="text-sm leading-relaxed whitespace-pre-line">{a.body}</p>}
              {attachments.length > 0 && <div className="mt-4"><FileList files={attachments} /></div>}
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface-2 rounded-[14px] px-2 py-3">
      <dd className="text-xl font-extrabold tabular-nums">{value}</dd>
      <dt className="text-muted text-xs">{label}</dt>
    </div>
  );
}
