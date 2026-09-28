import { requireActor } from "@/server/auth/guard";
import { listTeacherClasses } from "@/server/services/classes";
import { EmptyState, LinkButton, PageHeader } from "@/components/domain/page-parts";
import { toLocalInputValue } from "@/lib/dates";
import { createAssignmentAction } from "../../actions";
import { AssignmentForm } from "../assignment-form";
import { requestNow } from "@/lib/now";

export const metadata = { title: "Giao bài · Classroom Edu" };

export default async function NewAssignmentPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const actor = await requireActor("TEACHER");
  const { classId } = await searchParams;
  const classes = (await listTeacherClasses(actor)).filter((c) => c.status === "ACTIVE");
  if (!classes.length)
    return (
      <EmptyState
        title="Cần có lớp trước khi giao bài"
        action={<LinkButton href="/teacher/classes/new">Tạo lớp học</LinkButton>}
      />
    );
  const due = new Date(requestNow() + 7 * 86400_000);
  const dueStr = toLocalInputValue(due).slice(0, 11) + "23:59";
  return (
    <>
      <PageHeader title="Giao bài mới" back={{ href: "/teacher/assignments", label: "Bài tập" }} />
      <AssignmentForm
        action={createAssignmentAction}
        mode="create"
        classes={classes.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
        initial={{
          classIds: classes.some((c) => c.id === classId) ? [classId!] : [classes[0].id],
          type: "WRITTEN",
          title: "",
          body: "",
          maxPoints: 10,
          dueAt: dueStr,
          allowLate: true,
          allowResubmit: true,
          showResults: "IMMEDIATE",
          attachments: [],
        }}
      />
    </>
  );
}
