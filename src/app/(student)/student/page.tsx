import Link from "next/link";
import { Award, CalendarCheck, ChevronRight, School } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { studentOverview } from "@/server/services/submissions";
import { listStudentClasses } from "@/server/services/classes";
import { COLOR_CLASSES } from "@/components/domain/class-chip";
import { SubmissionStatusBadge } from "@/components/domain/submission-status-badge";
import { EmptyHint, Panel } from "@/components/domain/page-parts";
import { dayKeyVN, dayOfMonthVN, dueLabel, durationVN, weekdayVN } from "@/lib/dates";
import { formatScore } from "@/lib/format";
import { cn } from "@/lib/utils";
import { requestNow } from "@/lib/now";
import { ProductTour } from "@/components/onboarding/product-tour";
import { STUDENT_TOUR } from "@/components/onboarding/tour-steps";

export const metadata = { title: "Hôm nay · Classroom Edu" };

export default async function StudentHome({ searchParams }: { searchParams: Promise<{ tour?: string }> }) {
  const actor = await requireActor("STUDENT");
  const replay = (await searchParams).tour === "1";
  const [items, classes] = await Promise.all([studentOverview(actor), listStudentClasses(actor)]);

  const noClass = classes.length === 0;
  const now = requestNow();
  const todo = items.filter((i) => i.display === "NOT_STARTED" || i.display === "DRAFT" || (i.display === "MISSING" && i.allowLate));
  const overdue = todo.filter((i) => i.dueAt.getTime() < now);
  const upcoming = todo.filter((i) => i.dueAt.getTime() >= now);
  const urgent = upcoming[0];
  const weekEnd = now + 7 * 86400_000;
  const thisWeek = upcoming.filter((i) => i.dueAt.getTime() < weekEnd).slice(urgent ? 1 : 0);
  const later = upcoming.filter((i) => i.dueAt.getTime() >= weekEnd);
  const grades = items
    .filter((i) => i.resultsVisible && i.score !== null)
    .sort((a, b) => (b.returnedAt?.getTime() ?? 0) - (a.returnedAt?.getTime() ?? 0))
    .slice(0, 4);
  const weekItems = items.filter((i) => i.dueAt.getTime() >= now - 7 * 86400_000 && i.dueAt.getTime() < now);
  const doneThisWeek = weekItems.filter((i) => i.display !== "MISSING").length;

  const days = Array.from({ length: 7 }, (_, i) => new Date(now + i * 86400_000));
  const dueDays = new Set(upcoming.map((i) => dayKeyVN(i.dueAt)));

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Việc cần làm</h1>
      <ProductTour key={replay ? "replay" : "auto"} steps={STUDENT_TOUR} initialOpen={replay || !actor.tourDone} replay={replay} />

      <div className="grid grid-cols-7 gap-1.5" aria-hidden="true" data-tour="week">
        {days.map((d, i) => (
          <div
            key={i}
            className={cn(
              "relative rounded-[14px] border py-1.5 pb-3 text-center text-[11px] font-semibold",
              i === 0 ? "bg-foreground text-background border-foreground" : "bg-surface border-border text-muted",
            )}
          >
            {weekdayVN(d)}
            <b className={cn("block text-base", i === 0 ? "text-background" : "text-foreground")}>{dayOfMonthVN(d)}</b>
            {dueDays.has(dayKeyVN(d)) && <span className="bg-warning absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full" />}
          </div>
        ))}
      </div>

      <div data-tour="focus">
        {noClass ? (
          <div className="bg-surface border-border rounded-card flex items-start gap-4 border p-5">
            <span className="bg-primary-soft text-primary flex size-11 shrink-0 items-center justify-center rounded-[14px]" aria-hidden="true">
              <CalendarCheck className="size-5" />
            </span>
            <div>
              <p className="text-lg font-extrabold tracking-tight">Bạn chưa tham gia lớp nào</p>
              <p className="text-muted mt-1 text-sm">
                Nhờ giáo viên gửi link mời hoặc mã lớp rồi mở link đó để vào lớp. Bài tập, hạn nộp và điểm sẽ hiện ở trang này.
              </p>
            </div>
          </div>
        ) : urgent ? (
          <Link href={`/student/assignments/${urgent.id}`} className="bg-class-peach-bg text-class-peach-fg rounded-card relative block overflow-hidden p-5">
            <span className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full bg-white/30" aria-hidden="true" />
            <span className="bg-surface text-class-peach-fg relative rounded-full px-2.5 py-1 text-xs font-bold">{urgent.subject} · gần hạn nhất</span>
            <p className="text-foreground relative mt-3 text-xl font-extrabold tracking-tight">{urgent.title}</p>
            <p className="relative text-sm font-semibold">
              Hạn {dueLabel(urgent.dueAt)} · còn {durationVN(urgent.dueAt.getTime() - now)}
              {urgent.display === "DRAFT" && " · đang có nháp"}
            </p>
            <span className="bg-foreground text-background rounded-control relative mt-4 inline-flex items-center gap-1 px-4 py-2.5 text-sm font-bold">
              {urgent.display === "DRAFT" ? "Tiếp tục làm" : "Làm bài"} <ChevronRight className="size-4" aria-hidden="true" />
            </span>
          </Link>
        ) : overdue.length === 0 ? (
          <div className="bg-success-soft text-success rounded-card p-5 font-bold">Bạn không còn bài nào phải nộp. Tuyệt!</div>
        ) : (
          <div className="bg-danger-soft text-danger rounded-card p-5 font-bold">
            Không còn bài sắp đến hạn, nhưng bạn còn {overdue.length} bài quá hạn vẫn được nộp trễ.
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6" data-tour="todo">
          {overdue.length > 0 && <Group title="Quá hạn · vẫn nhận bài trễ" tone="text-danger" items={overdue} now={now} />}
          <Group title="Tuần này" items={thisWeek} now={now} empty={noClass ? "Chưa có bài tập nào." : "Không còn bài nào khác trong tuần."} />
          {later.length > 0 && <Group title="Sau đó" items={later} now={now} />}
        </div>
        <div className="space-y-6">
          <Panel title="Điểm mới" tour="grades" action={<Link href="/student/grades" className="text-primary text-xs font-bold">Tất cả</Link>}>
            {grades.length ? (
              <ul className="divide-border divide-y">
                {grades.map((g) => (
                  <li key={g.id}>
                    <Link href={`/student/assignments/${g.id}`} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{g.title}</p>
                        <p className="text-muted text-xs">{g.subject}</p>
                      </div>
                      <p className="text-success text-lg font-extrabold tabular-nums">
                        {formatScore(g.score!)}
                        <span className="text-muted text-xs font-semibold">/{formatScore(g.maxPoints)}</span>
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyHint icon={<Award />}>Chưa có bài nào được trả điểm.</EmptyHint>
            )}
          </Panel>
          {weekItems.length > 0 && (
            <Panel title="7 ngày qua">
              <p className="text-sm">
                Đã nộp <b>{doneThisWeek}</b>/{weekItems.length} bài đến hạn.
              </p>
            </Panel>
          )}
          <Panel title="Lớp của em">
            {noClass && <EmptyHint icon={<School />}>Chưa tham gia lớp nào.</EmptyHint>}
            <ul className="flex flex-wrap gap-2">
              {classes.map((c) => (
                <li key={c.id}>
                  <Link href={`/student/classes/${c.id}`} className={cn("inline-flex rounded-full px-3 py-1.5 text-xs font-bold", COLOR_CLASSES[c.color])}>
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

type Item = Awaited<ReturnType<typeof studentOverview>>[number];

function Group({ title, items, now, tone, empty }: { title: string; items: Item[]; now: number; tone?: string; empty?: string }) {
  return (
    <section>
      <h2 className={cn("mb-2 text-sm font-extrabold", tone ?? "text-foreground")}>{title}</h2>
      {items.length === 0 ? (
        <EmptyHint className="py-5">{empty}</EmptyHint>
      ) : (
        <ul className="space-y-2.5">
          {items.map((i) => (
            <li key={i.id}>
              <Link href={`/student/assignments/${i.id}`} className="bg-surface border-border hover:border-primary/40 flex items-center gap-3 rounded-[18px] border p-3">
                <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[14px] text-sm font-extrabold", COLOR_CLASSES[i.color])}>
                  {i.subject.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{i.title}</p>
                  <p className="text-muted text-xs">
                    {i.subject} · {i.dueAt.getTime() < now ? `quá hạn ${durationVN(now - i.dueAt.getTime())}` : dueLabel(i.dueAt)}
                    {i.type === "QUIZ" && " · trắc nghiệm"}
                  </p>
                </div>
                <SubmissionStatusBadge status={i.display} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
