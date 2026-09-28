import { requireActor } from "@/server/auth/guard";
import { assignmentRoster, submissionDetailForTeacher } from "@/server/services/submissions";
import { EmptyState, LinkButton, PageHeader } from "@/components/domain/page-parts";
import { GradingWorkspace } from "./grading-workspace";

export const metadata = { title: "Chấm bài · Classroom Edu" };

export default async function GradingPage({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ s?: string; focus?: string }>;
}) {
  const actor = await requireActor("TEACHER");
  const { assignmentId } = await params;
  const { s, focus } = await searchParams;
  const { a, cls, roster } = await assignmentRoster(actor, assignmentId);
  const turnedIn = roster.filter((r) => r.submissionId && r.status && r.status !== "DRAFT");
  const selectedId =
    (s && turnedIn.find((r) => r.submissionId === s)?.submissionId) ??
    turnedIn.find((r) => r.status === "SUBMITTED")?.submissionId ??
    turnedIn[0]?.submissionId;

  if (!selectedId) {
    return (
      <>
        <PageHeader title={a.title} back={{ href: `/teacher/assignments/${a.id}`, label: "Bài tập" }} />
        <EmptyState
          title="Chưa có học sinh nào nộp bài"
          description="Khi học sinh nộp, bài sẽ hiện ở đây để chấm."
          action={<LinkButton href={`/teacher/assignments/${a.id}`} variant="outline">Xem bài tập</LinkButton>}
        />
      </>
    );
  }
  const detail = await submissionDetailForTeacher(actor, selectedId);
  return (
    <GradingWorkspace
      key={selectedId}
      assignment={{ id: a.id, title: a.title, maxPoints: a.maxPoints, type: a.type, className: cls.name }}
      roster={roster.map((r) => ({
        submissionId: r.submissionId,
        fullName: r.fullName,
        status: r.status,
        display: r.display,
        score: r.score,
      }))}
      current={{
        id: detail.s.id,
        studentName: detail.studentName,
        status: detail.s.status,
        content: detail.s.content,
        isLate: detail.s.isLate,
        submittedAt: detail.s.submittedAt?.toISOString() ?? null,
        score: detail.s.score,
        feedback: detail.s.feedback ?? "",
        versionNo: detail.s.versionNo,
        files: detail.files,
        history: detail.history.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() })),
        quiz: detail.questions.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          points: q.points,
          options: q.options.map((o) => ({ id: o.id, label: o.label, isCorrect: "isCorrect" in o && o.isCorrect === true })),
          chosen: detail.s.quizAnswers?.[q.id] ?? [],
        })),
      }}
      initialFocus={focus === "1"}
    />
  );
}
