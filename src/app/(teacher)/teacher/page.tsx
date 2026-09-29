import Link from "next/link";
import { CalendarDays, ChevronRight, ClipboardList, GraduationCap, Plus, Send, UserPlus } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { teacherDashboard } from "@/server/services/dashboard";
import { ClassChip, COLOR_CLASSES } from "@/components/domain/class-chip";
import { SegmentedProgress } from "@/components/domain/segmented-progress";
import { EmptyHint, EmptyState, LinkButton, Panel } from "@/components/domain/page-parts";
import { dayKeyVN, dayOfMonthVN, dueLabel, durationVN, weekdayVN } from "@/lib/dates";
import { cn, initials } from "@/lib/utils";
import { requestNow } from "@/lib/now";
import { ProductTour } from "@/components/onboarding/product-tour";
import { TEACHER_TOUR } from "@/components/onboarding/tour-steps";

export const metadata = { title: "Tổng quan · Classroom Edu" };


export default async function TeacherDashboard({ searchParams }: { searchParams: Promise<{ tour?: string }> }) {
  const actor = await requireActor("TEACHER");
  const replay = (await searchParams).tour === "1";
  const d = await teacherDashboard(actor);

  const noClass = d.classes.length === 0;
  const today = new Date();
  const week = Array.from({ length: 7 }, (_, i) => new Date(today.getTime() + i * 86400_000));
  const dueByDay = new Map<string, number>();
  d.upcoming.forEach((a) => dueByDay.set(dayKeyVN(a.dueAt), (dueByDay.get(dayKeyVN(a.dueAt)) ?? 0) + 1));

  return (
    <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-12">
      <h1 className="sr-only">Tổng quan</h1>
      <ProductTour key={replay ? "replay" : "auto"} steps={TEACHER_TOUR} initialOpen={replay || !actor.tourDone} replay={replay} />

      {noClass && <GettingStarted />}

      {/* Hero: cần chấm */}
      <section data-tour="pending" className="from-primary to-primary-hover text-on-primary rounded-card relative flex min-h-[250px] flex-col overflow-hidden bg-gradient-to-br p-6 lg:col-span-4">
        <span className="pointer-events-none absolute -top-16 -right-14 size-56 rounded-full bg-white/10" aria-hidden="true" />
        <span className="pointer-events-none absolute right-10 -bottom-16 size-36 rounded-full bg-white/10" aria-hidden="true" />
        <h2 className="text-[15px] font-bold">Cần chấm</h2>
        <p className="mt-3 text-[64px] leading-none font-extrabold tracking-tight tabular-nums">{d.pending}</p>
        <p className="mt-1 text-sm font-medium">
          {d.pending
            ? `bài đang chờ${d.oldestPending ? ` · lâu nhất ${durationVN(requestNow() - d.oldestPending.getTime())}` : ""}`
            : noClass
              ? "Bài học sinh nộp sẽ hiện ở đây."
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
      <Panel title="Tỉ lệ nộp 2 tuần qua" className="lg:col-span-3" tour="rate">
        <div className="flex items-center gap-4">
          <Donut onTime={d.onTimeRate} late={d.lateRate} />
          <dl className="text-muted grid gap-2 text-xs">
            <Legend color="bg-success" label="Đúng hạn" value={pct(d.onTimeRate)} />
            <Legend color="bg-late-bar" label="Nộp trễ" value={pct(d.lateRate)} />
            <Legend color="bg-surface-2" label="Chưa nộp" value={pct(d.submitRate === null ? null : 100 - d.submitRate)} />
          </dl>
        </div>
        {d.submitRate === null && <p className="text-muted mt-3 text-xs">Chưa có bài nào đến hạn trong 2 tuần qua.</p>}
      </Panel>

      {/* Lịch hạn nộp */}
      <Panel title="Hạn nộp 7 ngày tới" className="lg:col-span-5" tour="calendar">
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
          <EmptyHint icon={<CalendarDays />} className="py-4">Không có hạn nộp nào trong 7 ngày tới.</EmptyHint>
        )}
      </Panel>

      {/* Tiến độ */}
      <Panel
        title="Tiến độ bài tập"
        action={<Link href="/teacher/assignments" className="text-primary text-xs font-bold">Xem tất cả</Link>}
        className="lg:col-span-7"
        tour="progress"
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
            description={noClass ? "Tạo lớp trước, sau đó giao bài cho lớp." : "Bài đã giao sẽ hiện ở đây kèm tiến độ nộp và chấm."}
            action={
              noClass ? (
                <LinkButton href="/teacher/classes/new" variant="outline">Tạo lớp học</LinkButton>
              ) : (
                <LinkButton href="/teacher/assignments/new">Tạo bài tập</LinkButton>
              )
            }
          />
        )}
      </Panel>

      {/* Lớp học */}
      <Panel
        title="Lớp học"
        action={<span className="text-muted text-xs font-semibold">{d.classes.length} lớp · {d.studentTotal} học sinh</span>}
        className="lg:col-span-5"
        tour="classes"
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
          {d.classes.length < 4 && (
            <Link
              href="/teacher/classes/new"
              className={cn(
                "border-border text-muted hover:border-primary/50 hover:text-primary rounded-tile flex min-h-28 flex-col items-center justify-center gap-1.5 border border-dashed p-4 text-sm font-semibold transition-colors",
                d.classes.length % 2 === 0 && "col-span-2",
              )}
            >
              <Plus className="size-5" aria-hidden="true" />
              {noClass ? "Tạo lớp đầu tiên" : "Thêm lớp"}
            </Link>
          )}
        </div>
      </Panel>
    </div>
  );
}

/** Tài khoản mới chưa có lớp: 3 bước bắt đầu, bước sau mở khi bước trước xong. */
function GettingStarted() {
  const steps = [
    { icon: GraduationCap, title: "Tạo lớp học", text: "Đặt tên lớp, môn và màu để dễ nhận ra.", href: "/teacher/classes/new", cta: "Tạo lớp" },
    { icon: UserPlus, title: "Thêm học sinh", text: "Dán danh sách họ tên để tạo tài khoản hàng loạt, hoặc gửi mã lớp." },
    { icon: Send, title: "Giao bài đầu tiên", text: "Bài tự luận hoặc trắc nghiệm tự chấm, có hạn nộp." },
  ];
  return (
    <section aria-labelledby="start-title" className="bg-surface border-border rounded-card border p-5 lg:col-span-12">
      <h2 id="start-title" className="text-lg font-extrabold tracking-tight">Chào mừng! Bắt đầu với 3 bước</h2>
      <p className="text-muted text-sm">Các ô bên dưới sẽ có số liệu khi lớp có học sinh và bài tập.</p>
      <ol className="mt-4 grid gap-3 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className={cn("rounded-tile flex gap-3 border p-4", i === 0 ? "border-primary/40 bg-primary-soft" : "border-border")}>
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold",
                i === 0 ? "bg-primary text-on-primary" : "bg-surface-2 text-muted",
              )}
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-bold">
                <s.icon className="size-4" aria-hidden="true" /> {s.title}
              </p>
              <p className="text-muted mt-0.5 text-sm">{s.text}</p>
              {s.href && (
                <LinkButton href={s.href} className="mt-3 h-9">
                  {s.cta}
                </LinkButton>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function pct(v: number | null) {
  return v === null ? "—" : `${v}%`;
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

function Donut({ onTime: rawOnTime, late: rawLate }: { onTime: number | null; late: number | null }) {
  const C = 2 * Math.PI * 46;
  const empty = rawOnTime === null;
  const onTime = rawOnTime ?? 0;
  const late = rawLate ?? 0;
  return (
    <svg width="104" height="104" viewBox="0 0 120 120" role="img" aria-label={empty ? "Chưa có số liệu" : `${onTime + late}% đã nộp`}>
      <circle cx="60" cy="60" r="46" fill="none" className="stroke-surface-2" strokeWidth="14" strokeDasharray={empty ? "4 6" : undefined} />
      <circle cx="60" cy="60" r="46" fill="none" className="stroke-success" strokeWidth="14" strokeDasharray={`${(C * onTime) / 100} ${C}`} transform="rotate(-90 60 60)" />
      <circle cx="60" cy="60" r="46" fill="none" className="stroke-late-bar" strokeWidth="14" strokeDasharray={`${(C * late) / 100} ${C}`} strokeDashoffset={`${-(C * onTime) / 100}`} transform="rotate(-90 60 60)" />
      <text x="60" y="58" textAnchor="middle" className="fill-foreground" fontSize="24" fontWeight="800">
        {empty ? "—" : `${onTime + late}%`}
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
