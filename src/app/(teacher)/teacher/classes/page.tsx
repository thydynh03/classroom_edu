import Link from "next/link";
import { GraduationCap, Plus } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { listTeacherClasses } from "@/server/services/classes";
import { COLOR_CLASSES } from "@/components/domain/class-chip";
import { EmptyState, LinkButton, PageHeader, SummaryStrip } from "@/components/domain/page-parts";
import { cn } from "@/lib/utils";

export const metadata = { title: "Lớp học · Classroom Edu" };

export default async function ClassesPage() {
  const actor = await requireActor("TEACHER");
  const all = await listTeacherClasses(actor);
  const active = all.filter((c) => c.status === "ACTIVE");
  const archived = all.filter((c) => c.status === "ARCHIVED");
  const students = active.reduce((s, c) => s + c.studentCount, 0);
  const openTotal = active.reduce((s, c) => s + c.openCount, 0);
  const emptyClasses = active.filter((c) => c.studentCount === 0).length;
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
      {active.length > 0 && (
        <SummaryStrip
          items={[
            { label: "Lớp đang dạy", value: active.length, hint: archived.length ? `${archived.length} lớp đã lưu trữ` : undefined },
            { label: "Học sinh", value: students, hint: emptyClasses ? `${emptyClasses} lớp chưa có học sinh` : "ở tất cả các lớp", tone: emptyClasses ? "warning" : "default" },
            { label: "Bài đang mở", value: openTotal, hint: "chưa tới hạn nộp" },
          ]}
        />
      )}
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
                <div className="p-4">
                  <p className="text-muted text-sm">{c.subject}{c.schoolYear ? ` · ${c.schoolYear}` : ""}</p>
                  <dl className="border-border mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center">
                    <div>
                      <dd className="text-lg font-extrabold tabular-nums">{c.studentCount}</dd>
                      <dt className="text-muted text-[11px] font-semibold">Học sinh</dt>
                    </div>
                    <div>
                      <dd className="text-lg font-extrabold tabular-nums">{c.openCount}</dd>
                      <dt className="text-muted text-[11px] font-semibold">Bài đang mở</dt>
                    </div>
                    <div>
                      <dd className="font-mono text-sm leading-7 font-bold">{c.joinCode}</dd>
                      <dt className="text-muted text-[11px] font-semibold">Mã lớp</dt>
                    </div>
                  </dl>
                </div>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/teacher/classes/new"
              className="border-border text-muted hover:border-primary hover:text-primary rounded-card flex h-full min-h-44 flex-col items-center justify-center gap-2 border border-dashed p-6 text-center text-sm font-semibold transition-colors"
            >
              <span className="bg-primary-soft text-primary flex size-10 items-center justify-center rounded-full">
                <Plus className="size-5" aria-hidden="true" />
              </span>
              Tạo lớp mới
              <span className="text-xs font-normal">Mỗi lớp có mã riêng để học sinh tự vào.</span>
            </Link>
          </li>
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
