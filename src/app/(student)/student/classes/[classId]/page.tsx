import Link from "next/link";
import { requireActor } from "@/server/auth/guard";
import { requireStudentOfClass } from "@/server/policy";
import { studentOverview } from "@/server/services/submissions";
import { listClassmateNames } from "@/server/services/classes";
import { ClassChip } from "@/components/domain/class-chip";
import { SubmissionStatusBadge } from "@/components/domain/submission-status-badge";
import { EmptyState, PageHeader, Panel } from "@/components/domain/page-parts";
import { dueLabel } from "@/lib/dates";
import { formatScore } from "@/lib/format";
import { listMaterialsForStudent } from "@/server/services/materials";
import { FileList } from "@/components/domain/file-uploader";

export default async function StudentClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const actor = await requireActor("STUDENT");
  const { classId } = await params;
  const cls = await requireStudentOfClass(actor, classId);
  const [all, mates, materials] = await Promise.all([
    studentOverview(actor),
    listClassmateNames(actor, classId),
    listMaterialsForStudent(actor, classId),
  ]);
  const items = all
    .filter((i) => i.classId === classId)
    .sort((a, b) => b.dueAt.getTime() - a.dueAt.getTime());
  return (
    <>
      <PageHeader
        back={{ href: "/student/classes", label: "Lớp học" }}
        eyebrow={<ClassChip color={cls.color}>{cls.subject}</ClassChip>}
        title={cls.name}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5">
          <section aria-label="Bài tập của lớp">
            {items.length === 0 ? (
              <EmptyState
                title="Lớp chưa có bài tập"
                description="Bài giáo viên giao sẽ hiện ở đây."
              />
            ) : (
              <ul className="bg-surface border-border rounded-card divide-border divide-y overflow-hidden border">
                {items.map((i) => (
                  <li key={i.id}>
                    <Link
                      href={`/student/assignments/${i.id}`}
                      className="hover:bg-surface-2 flex items-center gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{i.title}</p>
                        <p className="text-muted text-xs">
                          {i.type === "QUIZ" ? "Trắc nghiệm" : "Tự luận"} · hạn{" "}
                          {dueLabel(i.dueAt)}
                        </p>
                      </div>
                      {i.score !== null ? (
                        <b className="text-success tabular-nums">
                          {formatScore(i.score)}/{formatScore(i.maxPoints)}
                        </b>
                      ) : (
                        <SubmissionStatusBadge status={i.display} />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {materials.length > 0 && (
            <section aria-labelledby="materials-title" className="space-y-3">
              <h2 id="materials-title" className="text-[15px] font-bold">
                Tài liệu ({materials.length})
              </h2>
              {materials.map((m) => (
                <article
                  key={m.id}
                  className="bg-surface border-border rounded-card border p-4"
                >
                  <h3 className="font-bold">{m.title}</h3>
                  {m.body && (
                    <p className="mt-1 text-sm whitespace-pre-line">{m.body}</p>
                  )}
                  {m.files.length > 0 && (
                    <div className="mt-3">
                      <FileList files={m.files} />
                    </div>
                  )}
                </article>
              ))}
            </section>
          )}
        </div>
        <Panel title={`Thành viên (${mates.length})`} className="h-fit">
          <ul className="text-muted space-y-1 text-sm">
            {mates.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
