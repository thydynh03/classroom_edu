/** Luật vòng đời bài nộp (hàm thuần). */

export type SubStatus = "DRAFT" | "SUBMITTED" | "GRADED" | "RETURNED";
export type DisplayStatus =
  | "NOT_STARTED"
  | "DRAFT"
  | "SUBMITTED"
  | "LATE"
  | "GRADED"
  | "RETURNED"
  | "MISSING";

export function displayStatus(
  sub: { status: SubStatus; isLate: boolean } | null | undefined,
  dueAt: Date,
  now = new Date(),
): DisplayStatus {
  if (!sub || sub.status === "DRAFT") {
    if (now > dueAt) return "MISSING";
    return sub ? "DRAFT" : "NOT_STARTED";
  }
  if (sub.status === "SUBMITTED") return sub.isLate ? "LATE" : "SUBMITTED";
  return sub.status;
}

/** Học sinh có được sửa/nộp không. */
export function canEdit(
  sub: { status: SubStatus } | null | undefined,
  a: { dueAt: Date; allowLate: boolean; allowResubmit: boolean; type: "WRITTEN" | "QUIZ" },
  now = new Date(),
): { ok: true } | { ok: false; reason: string } {
  const pastDue = now > a.dueAt;
  if (pastDue && !a.allowLate) return { ok: false, reason: "Đã quá hạn nộp và giáo viên không nhận bài trễ." };
  if (!sub || sub.status === "DRAFT") return { ok: true };
  if (sub.status === "RETURNED" && a.allowResubmit && a.type === "WRITTEN") return { ok: true };
  if (sub.status === "SUBMITTED") return { ok: false, reason: "Bài đã nộp. Rút lại bài nếu muốn sửa." };
  return { ok: false, reason: "Bài đã được chấm, không sửa được nữa." };
}

export function isLateAt(submittedAt: Date, dueAt: Date) {
  return submittedAt.getTime() > dueAt.getTime();
}

/** Học sinh được xem điểm/kết quả chưa. */
export function resultsVisible(
  sub: { status: SubStatus } | null | undefined,
  a: { type: "WRITTEN" | "QUIZ"; showResults: "IMMEDIATE" | "AFTER_DUE" | "MANUAL"; dueAt: Date },
  now = new Date(),
) {
  if (!sub) return false;
  if (sub.status === "RETURNED") return true;
  if (a.type === "QUIZ" && sub.status === "GRADED") {
    if (a.showResults === "IMMEDIATE") return true;
    if (a.showResults === "AFTER_DUE") return now > a.dueAt;
  }
  return false;
}
