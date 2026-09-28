import { Clock, MessageSquareText, Star } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { getStudentAssignment } from "@/server/services/submissions";
import { ClassChip } from "@/components/domain/class-chip";
import { SubmissionStatusBadge } from "@/components/domain/submission-status-badge";
import { FileList } from "@/components/domain/file-uploader";
import { PageHeader, Panel } from "@/components/domain/page-parts";
import { dueLabel, durationVN, shortDateTime } from "@/lib/dates";
import { formatScore } from "@/lib/format";
import { cn } from "@/lib/utils";
import { WrittenPanel } from "./written-panel";
import { QuizPlayer } from "./quiz-player";
import { requestNow } from "@/lib/now";

export const metadata = { title: "Bài tập · Classroom Edu" };

export default async function StudentAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor("STUDENT");
  const { id } = await params;
  const v = await getStudentAssignment(actor, id);
  const { a, cls, submission: sub } = v;
  const now = requestNow();
  const remaining = a.dueAt.getTime() - now;
  const turnedIn = sub && sub.status !== "DRAFT";

  return (
    <>
      <PageHeader
        back={{ href: `/student/classes/${cls.id}`, label: cls.name }}
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <ClassChip color={cls.color}>{cls.name}</ClassChip>
            <SubmissionStatusBadge status={v.display} />
          </div>
        }
        title={a.title}
      />

      <div className="mb-5 flex flex-wrap gap-2 text-sm">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-bold",
            turnedIn ? "bg-surface-2 text-muted" : remaining < 0 ? "bg-danger-soft text-danger" : remaining < 86400_000 * 2 ? "bg-warning-soft text-warning" : "bg-surface-2",
          )}
        >
          <Clock className="size-4" aria-hidden="true" />
          {remaining < 0 ? `Quá hạn ${durationVN(-remaining)}` : `Còn ${durationVN(remaining)}`} · {dueLabel(a.dueAt)}
        </span>
        <span className="bg-surface-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold">
          <Star className="size-4" aria-hidden="true" /> {formatScore(a.maxPoints)} điểm
        </span>
        {!a.allowLate && remaining > 0 && <span className="bg-surface-2 text-muted rounded-full px-3 py-1.5 font-semibold">Không nhận bài trễ</span>}
      </div>

      {v.resultsVisible && sub?.score !== null && sub?.score !== undefined && (
        <section className="bg-success-soft rounded-card mb-5 flex flex-wrap items-center gap-5 p-5" aria-label="Kết quả">
          <p className="text-success text-5xl font-extrabold tabular-nums">
            {formatScore(sub.score)}
            <span className="text-muted text-lg font-bold">/{formatScore(a.maxPoints)}</span>
          </p>
          <div className="min-w-0 flex-1">
            <p className="text-success font-bold">{a.type === "QUIZ" ? "Kết quả trắc nghiệm" : "Giáo viên đã trả bài"}</p>
            {sub.feedback && (
              <p className="text-foreground mt-1 flex gap-2 text-sm">
                <MessageSquareText className="text-muted mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-pre-line">{sub.feedback}</span>
              </p>
            )}
            {sub.status === "RETURNED" && a.type === "WRITTEN" && a.allowResubmit && (
              <p className="text-muted mt-2 text-xs">Bạn có thể sửa bài và nộp lại bên dưới.</p>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          {(a.body || v.attachments.length > 0) && (
            <Panel title={a.type === "QUIZ" ? "Hướng dẫn" : "Đề bài"}>
              {a.body && <p className="text-[15px] leading-relaxed whitespace-pre-line">{a.body}</p>}
              {v.attachments.length > 0 && (
                <div className="mt-4">
                  <p className="text-muted mb-2 text-xs font-bold">Tài liệu ({v.attachments.length})</p>
                  <FileList files={v.attachments} />
                </div>
              )}
            </Panel>
          )}
          {a.type === "QUIZ" && (
            <QuizPlayer
              assignmentId={a.id}
              questions={v.questions}
              answers={sub?.quizAnswers ?? {}}
              mode={v.resultsVisible ? "review" : turnedIn ? "submitted" : v.edit.ok ? "take" : "submitted"}
            />
          )}
        </div>

        {a.type === "WRITTEN" && (
          <Panel
            title="Bài làm của em"
            action={turnedIn && sub?.submittedAt ? <span className="text-muted text-xs">Nộp {shortDateTime(sub.submittedAt)}{sub.isLate ? " · trễ" : ""}</span> : undefined}
            className="h-fit lg:sticky lg:top-24"
          >
            <WrittenPanel
              assignmentId={a.id}
              initialContent={sub?.content ?? ""}
              initialFiles={v.files}
              canEdit={v.edit.ok}
              editBlockedReason={v.edit.ok ? undefined : v.edit.reason}
              status={sub?.status ?? "NONE"}
              dueLabelText={dueLabel(a.dueAt)}
            />
          </Panel>
        )}
      </div>
    </>
  );
}
