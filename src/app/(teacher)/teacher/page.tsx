import Link from "next/link";
import { ChevronRight, ClipboardList, GraduationCap } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { teacherDashboard } from "@/server/services/dashboard";
import { ClassChip, COLOR_CLASSES } from "@/components/domain/class-chip";
import { SegmentedProgress } from "@/components/domain/segmented-progress";
import { EmptyState, LinkButton, Panel } from "@/components/domain/page-parts";
import { dayKeyVN, dayOfMonthVN, dueLabel, durationVN, weekdayVN } from "@/lib/dates";
import { cn, initials } from "@/lib/utils";
import { requestNow } from "@/lib/now";

export const metadata = { title: "Tổng quan · Classroom Edu" };


export default async function TeacherDashboard() {
  const actor = await requireActor("TEACHER");
  const d = await teacherDashboard(actor);

  if (!d.classes.length) {
    return (
      <EmptyState
        icon={<GraduationCap className="size-6" />}
        title="Bắt đầu bằng việc tạo lớp học đầu tiên"
        description="Tạo lớp, thêm học sinh bằng danh sách họ tên hoặc gửi mã lớp, rồi giao bài."
        action={<LinkButton href="/teacher/classes/new">Tạo lớp học</LinkButton>}
      />
    );
  }

  const today = new Date();
  const week = Array.from({ length: 7 }, (_, i) => new Date(today.getTime() + i * 86400_000));
  const dueByDay = new Map<string, number>();
  d.upcoming.forEach((a) => dueByDay.set(dayKeyVN(a.dueAt), (dueByDay.get(dayKeyVN(a.dueAt)) ?? 0) + 1));

  return (
    <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-12">
      <h1 className="sr-only">Tổng quan</h1>

      {/* Hero: cần chấm */}
      <section className="from-primary to-primary-hover text-on-primary rounded-card relative flex min-h-[250px] flex-col overflow-hidden bg-gradient-to-br p-6 lg:col-span-4">
        <span className="pointer-events-none absolute -top-16 -right-14 size-56 rounded-full bg-white/10" aria-hidden="true" />
        <span className="pointer-events-none absolute right-10 -bottom-16 size-36 rounded-full bg-white/10" aria-hidden="true" />
        <h2 className="text-[15px] font-bold">Cần chấm</h2>
        <p className="mt-3 text-[64px] leading-none font-extrabold tracking-tight tabular-nums">{d.pending}</p>
        <p className="mt-1 text-sm font-medium">
          {d.pending
            ? `bài đang chờ${d.oldestPending ? ` · lâu nhất ${durationVN(requestNow() - d.oldestPending.getTime())}` : ""}`
            : "Không còn bài nào chờ chấm."}
        </p>
        {d.waiting.length > 0 && (
          <div className="mt-auto flex items-center pt-4">
            {d.waiting.map((n, i) => (
              <span
                key={i}
                className="border-primary bg-on-primary text-primary -ml-2 flex size-8 items-center justify-center rounded-full border-2 text-[11px] font-bold first:ml-0"
                title={n}
              >
                {initials(n)}
              </span>
            ))}
          </div>
        )}
        {d.pending > 0 && (
          <Link
            href="/teacher/grading"
            className="bg-on-primary text-primary rounded-control relative mt-4 inline-flex w-fit items-center gap-1.5 px-4 py-2.5 text-sm font-bold focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
          >
            Bắt đầu chấm <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </section>

      {/* Tỉ lệ nộp */}
      <Panel title="Tỉ lệ nộp 2 tuần qua" className="lg:col-span-3">
        {d.submitRate === null ? (
          <p className="text-muted text-sm">Chưa có bài nào đến hạn.</p>
        ) : (
          <div className="flex items-center gap-4">
            <Donut onTime={d.onTimeRate ?? 0} late={d.lateRate ?? 0} />
            <dl className="text-muted grid gap-2 text-xs">
              <Legend color="bg-success" label="Đúng hạn" value={`${d.onTimeRate}%`} />
              <Legend color="bg-late-bar" label="Nộp trễ" value={`${d.lateRate}%`} />
              <Legend color="bg-surface-2" label="Chưa nộp" value={`${100 - (d.submitRate ?? 0)}%`} />
            </dl>
          </div>
        )}
      </Panel>

      {/* Lịch hạn nộp */}
      <Panel title="Hạn nộp 7 ngày tới" className="lg:col-span-5">
        <div className="mb-3 grid grid-cols-7 gap-1.5" aria-hidden="true">
          {week.map((day, i) => {
            const n = dueByDay.get(dayKeyVN(day)) ?? 0;
            return (
              <div
                key={i}
                className={cn(
                  "relative rounded-[14px] py-1.5 pb-3 text-center text-[11px] font-semibold",
                  i === 0 ? "bg-foreground text-background" : "text-muted",
                )}
              >
                {weekdayVN(day)}
                <b className={cn("block text-base", i === 0 ? "text-background" : "text-foreground")}>{dayOfMonthVN(day)}</b>
                {n > 0 && <span className="bg-warning absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full" />}
              </div>
            );
          })}
        </div>
        {d.upcoming.length ? (
          <ul className="divide-border divide-y divide-dashed">
            {d.upcoming.slice(0, 3).map((a) => (
              <li key={a.id}>
                <Link href={`/teacher/assignments/${a.id}`} className="hover:bg-surface-2 -mx-2 flex items-center gap-3 rounded-[12px] px-2 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.title}</p>
                    <p className="text-muted text-xs">
                      {a.className} · {dueLabel(a.dueAt)}
                    </p>
                  </div>
                  <span className="bg-warning-soft text-warning shrink-0 rounded-full px-2.5 py-1 text-xs font-bold">
                    {a.stats.missing} chưa nộp
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted text-sm">Không có hạn nộp nào trong tuần.</p>
        )}
      </Panel>

      {/* Tiến độ */}
      <Panel
        title="Tiến độ bài tập"
        action={<Link href="/teacher/assignments" className="text-primary text-xs font-bold">Xem tất cả</Link>}
        className="lg:col-span-7"
      >
        {d.progress.length ? (
          <ul className="divide-border divide-y">
            {d.progress.map((a) => (
              <li key={a.id}>
                <Link href={`/teacher/assignments/${a.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-3 sm:grid-cols-[76px_minmax(0,1fr)_170px_76px]">
                  <ClassChip color={a.classColor} className="hidden justify-center sm:inline-flex">
                    {a.className.split(" · ")[0]}
                  </ClassChip>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{a.title}</p>
                    <p className="text-muted text-xs">
                      {a.type === "QUIZ" ? "Trắc nghiệm" : "Tự luận"} · hạn {dueLabel(a.dueAt)}
                    </p>
                  </div>
                  <SegmentedProgress
                    graded={a.stats.graded}
                    pending={a.stats.pending}
                    late={0}
                    missing={a.stats.missing}
                    total={a.stats.total}
                    className="col-span-2 sm:col-span-1"
                  />
                  <p className="text-right text-sm font-bold tabular-nums max-sm:col-start-2 max-sm:row-start-1">
                    {a.stats.submitted}/{a.stats.total}
                    <span className="text-muted block text-[11px] font-medium">
                      {progressNote(a.stats)}
                    </span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<ClipboardList className="size-6" />}
            title="Chưa có bài tập nào đang mở"
            action={<LinkButton href="/teacher/assignments/new">Tạo bài tập</LinkButton>}
          />
        )}
      </Panel>

      {/* Lớp học */}
      <Panel
        title="Lớp học"
        action={<span className="text-muted text-xs font-semibold">{d.classes.length} lớp · {d.studentTotal} học sinh</span>}
        className="lg:col-span-5"
      >
        <div className="grid flex-1 grid-cols-2 gap-3">
          {d.classes.slice(0, 4).map((c) => (
            <Link
              key={c.id}
              href={`/teacher/classes/${c.id}`}
              className={cn(
                "rounded-tile flex min-h-28 flex-col justify-between p-4 transition-transform hover:-translate-y-px",
                COLOR_CLASSES[c.color],
              )}
            >
              <div>
                <p className="font-extrabold">{c.name}</p>
                <p className="text-xs font-semibold">
                  {c.subject} · {c.openCount} bài mở
                </p>
              </div>
              <p className="text-3xl font-extrabold tracking-tight tabular-nums">
                {c.studentCount}
                <small className="ml-1 text-xs font-semibold">HS</small>
              </p>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className={cn("size-2.5 rounded-[4px]", color)} aria-hidden="true" />
      <dt>{label}</dt>
      <dd className="text-foreground ml-auto pl-3 font-bold">{value}</dd>
    </div>
  );
}

function Donut({ onTime, late }: { onTime: number; late: number }) {
  const C = 2 * Math.PI * 46;
  return (
    <svg width="104" height="104" viewBox="0 0 120 120" role="img" aria-label={`${onTime + late}% đã nộp`}>
      <circle cx="60" cy="60" r="46" fill="none" className="stroke-surface-2" strokeWidth="14" />
      <circle cx="60" cy="60" r="46" fill="none" className="stroke-success" strokeWidth="14" strokeDasharray={`${(C * onTime) / 100} ${C}`} transform="rotate(-90 60 60)" />
      <circle cx="60" cy="60" r="46" fill="none" className="stroke-late-bar" strokeWidth="14" strokeDasharray={`${(C * late) / 100} ${C}`} strokeDashoffset={`${-(C * onTime) / 100}`} transform="rotate(-90 60 60)" />
      <text x="60" y="58" textAnchor="middle" className="fill-foreground" fontSize="24" fontWeight="800">
        {onTime + late}%
      </text>
      <text x="60" y="76" textAnchor="middle" className="fill-muted" fontSize="11">
        đã nộp
      </text>
    </svg>
  );
}

function progressNote(s: { total: number; submitted: number; pending: number; missing: number }) {
  if (s.pending) return `${s.pending} chờ chấm`;
  if (s.total === 0) return "lớp chưa có HS";
  if (s.missing === 0) return "đã chấm hết";
  if (s.submitted === 0) return "chưa ai nộp";
  return `${s.missing} chưa nộp`;
}
