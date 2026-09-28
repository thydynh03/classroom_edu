import { notFound } from "next/navigation";
import { requireActor } from "@/server/auth/guard";
import { getAssignmentForEdit } from "@/server/services/assignments";
import { PageHeader } from "@/components/domain/page-parts";
import { QuestionEditor } from "./question-editor";

export const metadata = { title: "Câu hỏi quiz · Classroom Edu" };

export default async function QuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor("TEACHER");
  const { id } = await params;
  const { a, cls, questions, hasSubmissions } = await getAssignmentForEdit(actor, id);
  if (a.type !== "QUIZ") notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Soạn câu hỏi"
        description={`${a.title} · ${cls.name}. Điểm từng câu là trọng số, kết quả quy đổi về thang ${a.maxPoints}.`}
        back={{ href: `/teacher/assignments/${a.id}`, label: a.title }}
      />
      <QuestionEditor
        assignmentId={a.id}
        locked={hasSubmissions}
        isDraft={a.status === "DRAFT"}
        initial={questions.map((q) => ({
          type: q.type,
          prompt: q.prompt,
          points: q.points,
          options: q.options.map((o) => ({ label: o.label, isCorrect: "isCorrect" in o ? o.isCorrect === true : false })),
        }))}
      />
    </div>
  );
}
