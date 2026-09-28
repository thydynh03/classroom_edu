import { requireActor } from "@/server/auth/guard";
import { getAssignmentForEdit } from "@/server/services/assignments";
import { PageHeader } from "@/components/domain/page-parts";
import { toLocalInputValue } from "@/lib/dates";
import { updateAssignmentAction } from "../../../actions";
import { AssignmentForm } from "../../assignment-form";

export const metadata = { title: "Sửa bài tập · Classroom Edu" };

export default async function EditAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor("TEACHER");
  const { id } = await params;
  const { a, cls, attachments } = await getAssignmentForEdit(actor, id);
  return (
    <>
      <PageHeader title="Sửa bài tập" description={cls.name} back={{ href: `/teacher/assignments/${a.id}`, label: a.title }} />
      <AssignmentForm
        action={updateAssignmentAction.bind(null, a.id)}
        mode="edit"
        classes={[{ id: cls.id, name: cls.name, color: cls.color }]}
        initial={{
          classIds: [cls.id],
          type: a.type,
          title: a.title,
          body: a.body,
          maxPoints: a.maxPoints,
          dueAt: toLocalInputValue(a.dueAt),
          allowLate: a.allowLate,
          allowResubmit: a.allowResubmit,
          showResults: a.showResults,
          attachments,
        }}
      />
    </>
  );
}
