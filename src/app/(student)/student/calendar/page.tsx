import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { studentOverview } from "@/server/services/submissions";
import { SubmissionStatusBadge } from "@/components/domain/submission-status-badge";
import { ClassChip } from "@/components/domain/class-chip";
import { EmptyState, PageHeader, SummaryStrip } from "@/components/domain/page-parts";
import { dayKeyVN, dayOfMonthVN, dueLabel, weekdayVN } from "@/lib/dates";
import { requestNow } from "@/lib/now";
import { cn } from "@/lib/utils";

export const metadata = { title: "Lịch · Classroom Edu" };

const DAY = 86400_000;
const dayTitle = (d: Date) =>
  new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(d);

/** Lịch hạn nộp: 7 ngày trước → 30 ngày tới, nhóm theo ngày (giờ Việt Nam). */
export default async function StudentCalendarPage() {
  const actor = await requireActor("STUDENT");
  const now = requestNow();
  const items = (await studentOverview(actor)).filter((i) => i.dueAt.getTime() >= now - 7 * DAY && i.dueAt.getTime() <= now + 30 * DAY);
  const today = dayKeyVN(new Date(now));
  const groups = new Map<string, typeof items>();
  for (const i of items) {
    const k = dayKeyVN(i.dueAt);
    groups.set(k, [...(groups.get(k) ?? []), i]);
  }
  const open = (i: (typeof items)[number]) => i.display === "NOT_STARTED" || i.display === "DRAFT";
  const days = Array.from({ length: 14 }, (_, n) => {
    const d = new Date(now + n * DAY);
    const key = dayKeyVN(d);
    const list = groups.get(key) ?? [];
    return { key, d, total: list.length, todo: list.filter(open).length };
  });
  const dueToday = (groups.get(today) ?? []).filter(open).length;
  const dueWeek = items.filter((i) => open(i) && i.dueAt.getTime() > now && i.dueAt.getTime() <= now + 7 * DAY).length;
  const missing = items.filter((i) => i.display === "MISSING").length;
  return (
    <>
      <PageHeader title="Lịch hạn nộp" description="Bài tập từ tuần trước tới 30 ngày tới." />
      <SummaryStrip
        items={[
          { label: "Hạn hôm nay", value: dueToday, hint: "bài chưa nộp", tone: dueToday ? "warning" : "default" },
          { label: "Trong 7 ngày tới", value: dueWeek, hint: "bài chưa nộp", tone: dueWeek ? "primary" : "default" },
          { label: "Quá hạn chưa nộp", value: missing, hint: "trong 7 ngày qua", tone: missing ? "danger" : "default" },
        ]}
      />
      <section aria-label="14 ngày tới" className="bg-surface border-border rounded-card mb-6 border p-3">
        <ol className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const inner = (
              <>
                <span className="text-muted text-[11px] font-semibold">{weekdayVN(d.d)}</span>
                <span className={cn("text-base font-extrabold tabular-nums", d.key === today && "text-primary")}>{dayOfMonthVN(d.d)}</span>
                <span className={cn("rounded-full px-1.5 text-[11px] font-bold tabular-nums", d.todo ? "bg-primary text-on-primary" : d.total ? "bg-success-soft text-success" : "text-transparent")}>
                  {d.total || 0}
                  <span className="sr-only"> bài, {d.todo} chưa nộp</span>
                </span>
              </>
            );
            const cls = cn("rounded-tile flex min-h-[72px] flex-col items-center justify-center gap-0.5 py-2", d.key === today ? "bg-primary-soft" : "bg-surface-2");
            return (
              <li key={d.key}>
                {d.total ? (
                  <a href={`#d-${d.key}`} className={cn(cls, "hover:ring-ring hover:ring-2")}>
                    {inner}
                  </a>
                ) : (
                  <div className={cls}>{inner}</div>
                )}
              </li>
            );
          })}
        </ol>
        <p className="text-muted mt-2.5 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="bg-primary size-2 rounded-full" aria-hidden="true" /> còn bài chưa nộp
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-success size-2 rounded-full" aria-hidden="true" /> đã nộp hết
          </span>
        </p>
      </section>
      {groups.size === 0 ? (
        <EmptyState icon={<CalendarDays className="size-6" />} title="Không có hạn nộp nào" description="Bài giáo viên giao sẽ hiện ở đây theo ngày." />
      ) : (
        <ol className="space-y-5">
          {[...groups].map(([key, list]) => {
            const past = key < today;
            return (
              <li key={key} id={`d-${key}`} className="scroll-mt-20">
                <h2 className={cn("mb-2 text-sm font-bold capitalize", key === today ? "text-primary" : past ? "text-muted" : "")}>
                  {key === today ? "Hôm nay · " : ""}
                  {dayTitle(list[0].dueAt)}
                </h2>
                <ul className="bg-surface border-border rounded-card divide-border divide-y overflow-hidden border">
                  {list.map((i) => (
                    <li key={i.id}>
                      <Link href={`/student/assignments/${i.id}`} className="hover:bg-surface-2 flex min-h-14 items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{i.title}</p>
                          <p className="text-muted flex flex-wrap items-center gap-2 text-xs">
                            <ClassChip color={i.color}>{i.className}</ClassChip>
                            hạn {dueLabel(i.dueAt)}
                          </p>
                        </div>
                        <SubmissionStatusBadge status={i.display} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
