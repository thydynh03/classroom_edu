"use client";

import * as React from "react";
import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Send } from "lucide-react";
import { toast } from "sonner";
import { saveGradeAction } from "../../actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmissionStatusBadge } from "@/components/domain/submission-status-badge";
import { FileIcon } from "@/components/domain/file-uploader";
import type { DisplayStatus } from "@/server/services/submission-rules";
import { formatScore } from "@/lib/format";
import { cn, initials } from "@/lib/utils";

type RosterItem = {
  submissionId: string | null;
  fullName: string;
  status: "DRAFT" | "SUBMITTED" | "GRADED" | "RETURNED" | null;
  display: DisplayStatus;
  score: number | null;
};
type Current = {
  id: string;
  studentName: string;
  status: "DRAFT" | "SUBMITTED" | "GRADED" | "RETURNED";
  content: string;
  isLate: boolean;
  submittedAt: string | null;
  score: number | null;
  feedback: string;
  versionNo: number;
  files: { id: string; name: string; mime: string; size: number }[];
  history: { id: string; score: number | null; action: string; createdAt: string; grader: string | null }[];
  quiz: { id: string; prompt: string; points: number; options: { id: string; label: string; isCorrect: boolean }[]; chosen: string[] }[];
};

const COMMENT_BANK = ["Trình bày rõ ràng.", "Cần ghi đủ các bước giải.", "Xem lại dấu và phép tính.", "Làm tốt, tiếp tục phát huy!", "Nộp lại sau khi sửa theo nhận xét."];
const TABS = [
  { id: "pending", label: "Chờ chấm", match: (r: RosterItem) => r.status === "SUBMITTED" },
  { id: "done", label: "Đã chấm", match: (r: RosterItem) => r.status === "GRADED" || r.status === "RETURNED" },
  { id: "missing", label: "Chưa nộp", match: (r: RosterItem) => !r.status || r.status === "DRAFT" },
] as const;
const ACTION_LABEL: Record<string, string> = { GRADED: "Chấm", EDITED: "Sửa điểm", RETURNED: "Trả bài", AUTO: "Tự chấm" };

export function GradingWorkspace({
  assignment,
  roster,
  current,
  initialFocus,
}: {
  assignment: { id: string; title: string; maxPoints: number; type: "WRITTEN" | "QUIZ"; className: string };
  roster: RosterItem[];
  current: Current;
  initialFocus: boolean;
}) {
  const router = useRouter();
  const [focus, setFocus] = React.useState(initialFocus);
  const [tab, setTab] = React.useState<(typeof TABS)[number]["id"]>(current.status === "SUBMITTED" ? "pending" : "done");
  const [score, setScore] = React.useState(current.score !== null ? formatScore(current.score) : "");
  const [feedback, setFeedback] = React.useState(current.feedback);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = useTransition();
  const feedbackRef = React.useRef<HTMLTextAreaElement>(null);
  const scoreRef = React.useRef<HTMLInputElement>(null);

  const turnedIn = roster.filter((r) => r.submissionId && r.status && r.status !== "DRAFT");
  const idx = turnedIn.findIndex((r) => r.submissionId === current.id);
  const nextPending = [...turnedIn.slice(idx + 1), ...turnedIn.slice(0, idx)].find((r) => r.status === "SUBMITTED");
  const q = (sid: string, f = focus) => `/teacher/grading/${assignment.id}?s=${sid}${f ? "&focus=1" : ""}`;
  const go = React.useCallback((sid: string | null | undefined) => sid && router.push(q(sid)), [router, focus]); // eslint-disable-line react-hooks/exhaustive-deps

  const quickScores = React.useMemo(() => {
    const m = assignment.maxPoints;
    const steps = m <= 10 ? [m, m - 0.5, m - 1, m - 1.5, m - 2, m - 3, m - 4, m / 2] : [m, m * 0.9, m * 0.8, m * 0.7, m * 0.6, m / 2];
    return [...new Set(steps.filter((x) => x >= 0).map((x) => Math.round(x * 4) / 4))];
  }, [assignment.maxPoints]);

  function submit(returnNow: boolean) {
    setError(null);
    if (!score.trim()) {
      setError("Nhập điểm trước.");
      scoreRef.current?.focus();
      return;
    }
    start(async () => {
      const r = await saveGradeAction(current.id, { score, feedback, returnNow });
      if (r.error) {
        setError(r.error);
        return;
      }
      toast.success(r.message ?? "Đã lưu");
      if (returnNow && nextPending?.submissionId) go(nextPending.submissionId);
      else router.refresh();
    });
  }

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      const typing = t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        submit(true);
        return;
      }
      if (e.key === "Escape" && focus) {
        setFocus(false);
        return;
      }
      if (typing) return;
      if (e.key === "j" || e.key === "J") go(turnedIn[idx + 1]?.submissionId);
      else if (e.key === "k" || e.key === "K") go(turnedIn[idx - 1]?.submissionId);
      else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        submit(false);
      } else if (e.key === "f" || e.key === "F") setFocus((v) => !v);
      else if (e.key === "/") {
        e.preventDefault();
        feedbackRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const listItems = roster.filter(TABS.find((t) => t.id === tab)!.match);
  const pendingCount = roster.filter(TABS[0].match).length;
  const reviewed = turnedIn.filter((r) => r.status !== "SUBMITTED").length;

  const list = (
    <aside className="bg-surface border-border rounded-card flex min-h-0 flex-col border p-3" aria-label="Danh sách bài nộp">
      <div className="mb-2 flex gap-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn("rounded-full px-2.5 py-1 text-xs font-bold", tab === t.id ? "bg-foreground text-background" : "bg-surface-2 text-muted")}
          >
            {t.label} {roster.filter(t.match).length}
          </button>
        ))}
      </div>
      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        {listItems.length === 0 && <li className="text-muted px-2 py-4 text-sm">Không có học sinh nào.</li>}
        {listItems.map((r, i) => {
          const active = r.submissionId === current.id;
          const content = (
            <>
              <span className="bg-primary-soft text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">{initials(r.fullName)}</span>
              <span className="min-w-0 flex-1 truncate text-left">{r.fullName}</span>
              {r.score !== null ? <b className="text-sm tabular-nums">{formatScore(r.score)}</b> : <SubmissionStatusBadge status={r.display} className="text-[11px]" />}
            </>
          );
          return (
            <li key={r.submissionId ?? `m-${i}`}>
              {r.submissionId && r.status !== "DRAFT" ? (
                <Link href={q(r.submissionId)} aria-current={active ? "true" : undefined} className={cn("flex items-center gap-2.5 rounded-[14px] px-2 py-2 text-sm font-semibold", active ? "bg-primary-soft" : "hover:bg-surface-2")}>
                  {content}
                </Link>
              ) : (
                <div className="text-muted flex items-center gap-2.5 px-2 py-2 text-sm font-semibold">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );

  const viewer = (
    <section className="bg-surface-2 rounded-card flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto p-5" aria-label="Bài làm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="bg-primary text-on-primary flex size-11 items-center justify-center rounded-full text-sm font-bold">{initials(current.studentName)}</span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-extrabold">{current.studentName}</h1>
          <p className="text-muted text-xs">
            {current.submittedAt ? `Nộp ${new Date(current.submittedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : ""}
            {current.versionNo > 1 && ` · lần nộp thứ ${current.versionNo}`}
          </p>
        </div>
        <SubmissionStatusBadge status={current.status === "SUBMITTED" ? (current.isLate ? "LATE" : "SUBMITTED") : current.status === "DRAFT" ? "DRAFT" : current.status} />
        {current.isLate && current.status !== "SUBMITTED" && <SubmissionStatusBadge status="LATE" />}
      </div>

      {assignment.type === "QUIZ" ? (
        <ol className="space-y-3">
          {current.quiz.map((qq, i) => {
            const correct = qq.options.filter((o) => o.isCorrect).map((o) => o.id);
            const ok = qq.chosen.length === correct.length && qq.chosen.every((c) => correct.includes(c));
            return (
              <li key={qq.id} className="bg-surface rounded-[16px] p-4">
                <p className="text-sm font-bold">
                  Câu {i + 1}. {qq.prompt} <span className={ok ? "text-success" : "text-danger"}>{ok ? `+${qq.points}` : "0"}</span>
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {qq.options.map((o) => (
                    <li key={o.id} className={cn(o.isCorrect ? "text-success font-semibold" : qq.chosen.includes(o.id) ? "text-danger" : "text-muted")}>
                      {qq.chosen.includes(o.id) ? "● " : "○ "}
                      {o.label}
                      {o.isCorrect && " (đúng)"}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      ) : (
        <>
          {current.content.trim() && (
            <div className="bg-surface rounded-[16px] p-4">
              <p className="text-muted mb-1 text-xs font-semibold">Bài viết / ghi chú của học sinh</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{current.content}</p>
            </div>
          )}
          {current.files.length === 0 && !current.content.trim() && <p className="text-muted text-sm">Bài nộp không có nội dung.</p>}
          <div className="grid gap-4 xl:grid-cols-2">
            {current.files.map((f) =>
              f.mime.startsWith("image/") && f.mime !== "image/heic" ? (
                <a key={f.id} href={`/files/${f.id}?inline=1`} target="_blank" rel="noreferrer" className="bg-surface block overflow-hidden rounded-[16px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/files/${f.id}?inline=1`} alt={`Ảnh bài làm: ${f.name}`} className="w-full" loading="lazy" />
                </a>
              ) : (
                <a key={f.id} href={`/files/${f.id}?inline=1`} target="_blank" rel="noreferrer" className="bg-surface hover:bg-surface flex items-center gap-3 rounded-[16px] p-3 text-sm font-semibold hover:underline">
                  <FileIcon mime={f.mime} /> {f.name}
                </a>
              ),
            )}
          </div>
        </>
      )}
    </section>
  );

  const panel = (
    <aside className="bg-surface border-border rounded-card flex flex-col gap-4 border p-5" aria-label="Chấm điểm">
      <div>
        <Label htmlFor="score" className="text-muted mb-2 block text-xs font-bold">Điểm</Label>
        <div className="flex items-baseline gap-2">
          <input
            ref={scoreRef}
            id="score"
            inputMode="decimal"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="border-primary ring-primary-soft focus-visible:ring-ring rounded-[18px] border-2 px-3 py-2 text-center text-4xl font-extrabold tabular-nums ring-4 focus-visible:outline-hidden w-32"
            aria-describedby="score-max"
          />
          <span id="score-max" className="text-muted text-xl font-bold">/ {formatScore(assignment.maxPoints)}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5" aria-label="Điểm nhanh">
        {quickScores.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setScore(formatScore(v))}
            className={cn("border-border rounded-[10px] border px-2.5 py-1 text-xs font-bold tabular-nums", score === formatScore(v) ? "bg-foreground text-background border-foreground" : "hover:bg-surface-2")}
          >
            {formatScore(v)}
          </button>
        ))}
      </div>
      <div>
        <Label htmlFor="feedback" className="text-muted mb-2 block text-xs font-bold">Nhận xét</Label>
        <Textarea ref={feedbackRef} id="feedback" rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Nhận xét cho học sinh" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {COMMENT_BANK.map((c) => (
            <button key={c} type="button" onClick={() => setFeedback((f) => (f.trim() ? `${f.trim()} ${c}` : c))} className="bg-surface-2 text-muted hover:text-foreground rounded-full px-2.5 py-1 text-xs font-semibold">
              + {c}
            </button>
          ))}
        </div>
      </div>
      {error && <p role="alert" className="text-danger text-sm font-semibold">{error}</p>}
      <div className="mt-auto grid gap-2">
        <Button disabled={pending} onClick={() => submit(true)}>
          <Send aria-hidden="true" /> {nextPending ? "Trả bài và sang bài tiếp" : "Trả bài"}
          <kbd className="ml-1 hidden rounded border border-current/30 px-1 font-mono text-[10px] opacity-80 lg:inline">Ctrl ↵</kbd>
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => submit(false)}>
          Lưu nháp, chưa trả <kbd className="ml-1 hidden rounded border border-current/30 px-1 font-mono text-[10px] opacity-70 lg:inline">S</kbd>
        </Button>
      </div>
      {current.history.length > 0 && (
        <details className="text-xs">
          <summary className="text-muted cursor-pointer font-semibold">Lịch sử chấm ({current.history.length})</summary>
          <ul className="text-muted mt-2 space-y-1">
            {current.history.map((h) => (
              <li key={h.id}>
                {new Date(h.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · {ACTION_LABEL[h.action] ?? h.action}
                {h.score !== null && ` · ${formatScore(h.score)}`}
                {h.grader && ` · ${h.grader}`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </aside>
  );

  const header = (
    <div className="flex flex-wrap items-center gap-3">
      {focus ? (
        <button onClick={() => setFocus(false)} className="text-muted flex items-center gap-1.5 text-xs font-semibold">
          <kbd className="border-border rounded border px-1.5 font-mono">Esc</kbd> thoát tập trung
        </button>
      ) : (
        <Link href={`/teacher/assignments/${assignment.id}`} className="text-muted hover:text-foreground inline-flex items-center gap-1 text-sm font-semibold">
          <ChevronLeft className="size-4" aria-hidden="true" /> {assignment.className}
        </Link>
      )}
      <p className="min-w-0 flex-1 truncate font-bold">{assignment.title}</p>
      <span className="text-muted text-xs tabular-nums">
        {reviewed}/{turnedIn.length} đã chấm · {pendingCount} chờ
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" aria-label="Bài trước (K)" disabled={idx <= 0} onClick={() => go(turnedIn[idx - 1]?.submissionId)}>
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon" aria-label="Bài sau (J)" disabled={idx >= turnedIn.length - 1} onClick={() => go(turnedIn[idx + 1]?.submissionId)}>
          <ChevronRight />
        </Button>
        <Button variant={focus ? "default" : "outline"} size="sm" onClick={() => setFocus((v) => !v)} aria-pressed={focus}>
          {focus ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
          <span className="hidden sm:inline">Tập trung</span>
          <kbd className="hidden font-mono text-[10px] opacity-70 lg:inline">F</kbd>
        </Button>
      </div>
    </div>
  );

  const strip = (
    <div className="flex items-center gap-2 overflow-x-auto pt-3" aria-label="Chuyển nhanh học sinh">
      {turnedIn.map((r) => (
        <Link
          key={r.submissionId}
          href={q(r.submissionId!)}
          title={r.fullName}
          className={cn(
            "relative flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
            r.submissionId === current.id ? "bg-primary text-on-primary ring-primary ring-offset-background ring-2 ring-offset-2" : "bg-surface-2 text-muted",
          )}
        >
          {initials(r.fullName)}
          <span className={cn("ring-background absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2", r.status === "SUBMITTED" ? "bg-warning" : "bg-success")} aria-hidden="true" />
          <span className="sr-only">{r.status === "SUBMITTED" ? "chờ chấm" : "đã chấm"}</span>
        </Link>
      ))}
    </div>
  );

  const body = (
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
      <div className={cn("hidden min-h-0 lg:flex", focus && "lg:hidden")}>{list}</div>
      <div className={cn("min-h-0 lg:flex", focus ? "lg:col-span-2" : "")}>{viewer}</div>
      {panel}
    </div>
  );

  if (focus) {
    return (
      <div className="bg-background fixed inset-0 z-50 flex flex-col gap-4 p-4 md:p-6" role="dialog" aria-modal="true" aria-label="Chế độ tập trung chấm bài">
        {header}
        {body}
        {strip}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-10rem)]">
      {header}
      {body}
      <p className="text-muted hidden text-xs lg:block">
        Phím tắt: <kbd>J</kbd>/<kbd>K</kbd> chuyển bài · <kbd>Ctrl ↵</kbd> trả bài · <kbd>S</kbd> lưu nháp · <kbd>/</kbd> gõ nhận xét · <kbd>F</kbd> chế độ tập trung
      </p>
    </div>
  );
}
