import Link from "next/link";
import { GraduationCap, Plus } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { listTeacherClasses } from "@/server/services/classes";
import { COLOR_CLASSES } from "@/components/domain/class-chip";
import { EmptyState, LinkButton, PageHeader } from "@/components/domain/page-parts";
import { cn } from "@/lib/utils";

export const metadata = { title: "Lớp học · Classroom Edu" };

export default async function ClassesPage() {
  const actor = await requireActor("TEACHER");
  const all = await listTeacherClasses(actor);
  const active = all.filter((c) => c.status === "ACTIVE");
  const archived = all.filter((c) => c.status === "ARCHIVED");
  return (
    <>
      <PageHeader
        title="Lớp học"
        description={`${active.length} lớp đang dạy`}
        actions={
          <LinkButton href="/teacher/classes/new">
            <Plus aria-hidden="true" /> Tạo lớp
          </LinkButton>
        }
      />
      {active.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="size-6" />}
          title="Chưa có lớp nào"
          description="Tạo lớp để thêm học sinh và giao bài."
          action={<LinkButton href="/teacher/classes/new">Tạo lớp đầu tiên</LinkButton>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((c) => (
            <li key={c.id}>
              <Link
                href={`/teacher/classes/${c.id}`}
                className="bg-surface border-border rounded-card block overflow-hidden border transition-transform hover:-translate-y-px"
              >
                <div className={cn("flex h-20 items-end p-4", COLOR_CLASSES[c.color])}>
                  <p className="text-lg font-extrabold">{c.name}</p>
                </div>
                <div className="text-muted flex justify-between p-4 text-sm">
                  <span>{c.subject}{c.schoolYear ? ` · ${c.schoolYear}` : ""}</span>
                  <span className="text-foreground font-semibold tabular-nums">
                    {c.studentCount} HS · {c.openCount} bài mở
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {archived.length > 0 && (
        <section className="mt-10">
          <h2 className="text-muted mb-3 text-sm font-bold">Đã lưu trữ</h2>
          <ul className="divide-border bg-surface border-border rounded-card divide-y border">
            {archived.map((c) => (
              <li key={c.id}>
                <Link href={`/teacher/classes/${c.id}`} className="hover:bg-surface-2 flex justify-between px-4 py-3 text-sm">
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-muted">{c.studentCount} HS</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
