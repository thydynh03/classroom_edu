import "server-only";
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/server/db/client";
import { assignments, classMembers, submissions, users } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { requireTeacherOfClass } from "@/server/policy";
import { listTeacherClasses } from "./classes";
import { listTeacherAssignments } from "./assignments";
import { gradingQueue } from "./submissions";
import { displayStatus, type DisplayStatus } from "./submission-rules";

export async function teacherDashboard(actor: Actor) {
  const [classes, all, queue] = await Promise.all([
    listTeacherClasses(actor),
    listTeacherAssignments(actor, { status: "PUBLISHED" }),
    gradingQueue(actor),
  ]);
  const now = Date.now();
  const week = now + 7 * 86400_000;
  const upcoming = all
    .filter((a) => a.dueAt.getTime() > now && a.dueAt.getTime() < week)
    .sort((x, y) => x.dueAt.getTime() - y.dueAt.getTime());
  const active = all.filter((a) => a.dueAt.getTime() > now - 14 * 86400_000);
  const totals = active.reduce(
    (s, a) => ({
      expected: s.expected + a.stats.total,
      submitted: s.submitted + a.stats.submitted,
      late: s.late + a.stats.late,
    }),
    { expected: 0, submitted: 0, late: 0 },
  );
  const pending = queue.reduce((s, q) => s + q.pending, 0);
  // Avatar của vài học sinh đang chờ chấm
  const waiting = queue.length
    ? await db
        .select({ fullName: users.fullName })
        .from(submissions)
        .innerJoin(users, eq(users.id, submissions.studentId))
        .where(and(eq(submissions.status, "SUBMITTED"), inArray(submissions.assignmentId, queue.map((q) => q.assignmentId))))
        .orderBy(asc(submissions.submittedAt))
        .limit(5)
    : [];
  return {
    classes: classes.filter((c) => c.status === "ACTIVE"),
    studentTotal: classes.filter((c) => c.status === "ACTIVE").reduce((s, c) => s + c.studentCount, 0),
    pending,
    oldestPending: queue[0]?.oldest ? new Date(queue[0].oldest) : null,
    waiting: waiting.map((w) => w.fullName),
    submitRate: totals.expected ? Math.round((totals.submitted / totals.expected) * 100) : null,
    onTimeRate: totals.expected ? Math.round(((totals.submitted - totals.late) / totals.expected) * 100) : null,
    lateRate: totals.expected ? Math.round((totals.late / totals.expected) * 100) : null,
    upcoming,
    progress: active.slice(0, 6),
  };
}

export type HeatCell = { assignmentId: string; status: DisplayStatus };

/** Heatmap học sinh × bài tập (8 bài đã đăng gần nhất) của một lớp. */
export async function classHeatmap(actor: Actor, classId: string, limit = 8) {
  await requireTeacherOfClass(actor, classId);
  const cols = await db
    .select({ id: assignments.id, title: assignments.title, dueAt: assignments.dueAt })
    .from(assignments)
    .where(and(eq(assignments.classId, classId), eq(assignments.status, "PUBLISHED")))
    .orderBy(desc(assignments.dueAt))
    .limit(limit);
  cols.reverse();
  const students = await db
    .select({ id: users.id, fullName: users.fullName })
    .from(classMembers)
    .innerJoin(users, eq(users.id, classMembers.userId))
    .where(and(eq(classMembers.classId, classId), eq(classMembers.role, "STUDENT"), eq(classMembers.status, "ACTIVE")))
    .orderBy(asc(users.fullName));
  const subs = cols.length
    ? await db
        .select({ assignmentId: submissions.assignmentId, studentId: submissions.studentId, status: submissions.status, isLate: submissions.isLate })
        .from(submissions)
        .where(inArray(submissions.assignmentId, cols.map((c) => c.id)))
    : [];
  const rows = students.map((s) => ({
    ...s,
    cells: cols.map<HeatCell>((c) => {
      const sub = subs.find((x) => x.assignmentId === c.id && x.studentId === s.id);
      return { assignmentId: c.id, status: displayStatus(sub, c.dueAt) };
    }),
  }));
  return { cols, rows };
}

/** Bài đến hạn trong khoảng [from, to] (dùng cho job nhắc hạn). */
export async function assignmentsDueBetween(from: Date, to: Date) {
  return db
    .select()
    .from(assignments)
    .where(and(eq(assignments.status, "PUBLISHED"), gte(assignments.dueAt, from), lte(assignments.dueAt, to)));
}

