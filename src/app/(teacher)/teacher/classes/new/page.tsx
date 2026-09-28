import { PageHeader } from "@/components/domain/page-parts";
import { createClassAction } from "../../actions";
import { ClassForm } from "../class-form";

export const metadata = { title: "Tạo lớp · Classroom Edu" };

export default function NewClassPage() {
  return (
    <>
      <PageHeader title="Tạo lớp học" back={{ href: "/teacher/classes", label: "Lớp học" }} />
      <div className="bg-surface border-border rounded-card border p-6">
        <ClassForm action={createClassAction} submitLabel="Tạo lớp" />
      </div>
    </>
  );
}
