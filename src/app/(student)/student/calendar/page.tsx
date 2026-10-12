import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { studentOverview } from "@/server/services/submissions";
import { SubmissionStatusBadge } from "@/components/domain/submission-status-badge";
import { ClassChip } from "@/components/domain/class-chip";
import { EmptyState, PageHeader } from "@/components/domain/page-parts";
import { dayKeyVN, dueLabel } from "@/lib/dates";
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
  return (
    <>
      <PageHeader title="Lịch hạn nộp" description="Bài tập từ tuần trước tới 30 ngày tới." />
      {groups.size === 0 ? (
        <EmptyState icon={<CalendarDays className="size-6" />} title="Không có hạn nộp nào" description="Bài giáo viên giao sẽ hiện ở đây theo ngày." />
      ) : (
        <ol className="space-y-5">
          {[...groups].map(([key, list]) => {
            const past = key < today;
            return (
              <li key={key}>
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
