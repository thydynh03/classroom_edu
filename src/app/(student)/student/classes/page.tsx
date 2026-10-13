import Link from "next/link";
import { BookOpen } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { listMyInvites, listStudentClasses } from "@/server/services/classes";
import { studentOverview } from "@/server/services/submissions";
import { COLOR_CLASSES } from "@/components/domain/class-chip";
import { EmptyState, PageHeader, SummaryStrip } from "@/components/domain/page-parts";
import { dueLabel } from "@/lib/dates";
import { formatScore } from "@/lib/format";
import { requestNow } from "@/lib/now";
import { cn } from "@/lib/utils";
import { JoinByCode } from "./join-by-code";
import { InviteList } from "./invite-list";

export const metadata = { title: "Lớp học · Classroom Edu" };

export default async function StudentClassesPage() {
  const actor = await requireActor("STUDENT");
  const [classes, invites, overview] = await Promise.all([listStudentClasses(actor), listMyInvites(actor), studentOverview(actor)]);
  const now = requestNow();
  const perClass = new Map(
    classes.map((c) => {
      const items = overview.filter((i) => i.classId === c.id);
      const todo = items.filter((i) => (i.display === "NOT_STARTED" || i.display === "DRAFT") && i.dueAt.getTime() > now);
      const scored = items.filter((i) => i.resultsVisible && i.score !== null);
      const avg = scored.length ? scored.reduce((s, i) => s + (i.score! / i.maxPoints) * 10, 0) / scored.length : null;
      return [c.id, { total: items.length, todo: todo.length, next: todo[0], missing: items.filter((i) => i.display === "MISSING").length, avg }] as const;
    }),
  );
  const todoTotal = [...perClass.values()].reduce((s, c) => s + c.todo, 0);
  const missingTotal = [...perClass.values()].reduce((s, c) => s + c.missing, 0);
  return (
    <>
      <PageHeader title="Lớp học" description={`${classes.length} lớp đang tham gia`} />
      <InviteList invites={invites} />
      {classes.length > 0 && (
        <SummaryStrip
          items={[
            { label: "Lớp", value: classes.length },
            { label: "Bài cần làm", value: todoTotal, hint: todoTotal ? "chưa nộp, còn hạn" : "Bạn đã làm hết", tone: todoTotal ? "primary" : "success" },
            { label: "Quá hạn chưa nộp", value: missingTotal, tone: missingTotal ? "danger" : "default" },
          ]}
        />
      )}
      <div className="mb-6">
        <JoinByCode />
      </div>
      {classes.length === 0 ? (
        <EmptyState icon={<BookOpen className="size-6" />} title="Bạn chưa tham gia lớp nào" description="Nhập mã lớp giáo viên gửi ở ô bên trên." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {classes.map((c) => {
            const s = perClass.get(c.id)!;
            return (
              <li key={c.id}>
                <Link href={`/student/classes/${c.id}`} className="bg-surface border-border rounded-card block overflow-hidden border transition-transform hover:-translate-y-px">
                  <div className={cn("flex h-20 items-end p-4", COLOR_CLASSES[c.color])}>
                    <p className="text-lg font-extrabold">{c.name}</p>
                  </div>
                  <div className="p-4">
                    <p className="text-muted text-sm">
                      {c.subject} · {c.teacherName}
                    </p>
                    <dl className="border-border mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center">
                      <div>
                        <dd className={cn("text-lg font-extrabold tabular-nums", s.todo && "text-primary")}>{s.todo}</dd>
                        <dt className="text-muted text-[11px] font-semibold">Cần làm</dt>
                      </div>
                      <div>
                        <dd className="text-lg font-extrabold tabular-nums">{s.total}</dd>
                        <dt className="text-muted text-[11px] font-semibold">Bài tập</dt>
                      </div>
                      <div>
                        <dd className="text-lg font-extrabold tabular-nums">{s.avg === null ? "—" : formatScore(Math.round(s.avg * 10) / 10)}</dd>
                        <dt className="text-muted text-[11px] font-semibold">Điểm TB (thang 10)</dt>
                      </div>
                    </dl>
                    <p className="text-muted mt-3 truncate text-xs">
                      {s.next ? (
                        <>
                          Hạn gần nhất: <span className="text-foreground font-semibold">{s.next.title}</span> · {dueLabel(s.next.dueAt)}
                        </>
                      ) : s.total ? (
                        "Không còn bài nào cần làm."
                      ) : (
                        "Giáo viên chưa giao bài nào."
                      )}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
