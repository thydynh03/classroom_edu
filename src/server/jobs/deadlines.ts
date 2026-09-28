import "server-only";
import { and, eq, isNull, lte, gt, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { assignments, classMembers, classes, submissions } from "@/server/db/schema";
import { flushNotificationEmails, notify } from "@/server/services/notifications";
import { publishDueScheduled } from "@/server/services/assignments";

/**
 * Quét hạn nộp (chạy mỗi 15 phút):
 * - DUE_SOON: 1 lần, 24h trước hạn, cho HS chưa nộp.
 * - OVERDUE: 1 lần sau hạn, cho HS chưa nộp.
 */
export async function scanDeadlines(now = new Date()) {
  const soon = new Date(now.getTime() + 24 * 3600_000);
  const dueSoon = await db
    .select({ a: assignments, className: classes.name })
    .from(assignments)
    .innerJoin(classes, eq(classes.id, assignments.classId))
    .where(and(eq(assignments.status, "PUBLISHED"), isNull(assignments.dueSoonNotifiedAt), gt(assignments.dueAt, now), lte(assignments.dueAt, soon)));
  for (const { a, className } of dueSoon) {
    await db.transaction(async (tx) => {
      const pending = await studentsNotSubmitted(tx, a.id, a.classId);
      await notify(
        tx,
        pending.map((id) => ({
          recipientId: id,
          type: "ASSIGNMENT_DUE_SOON" as const,
          title: `Sắp đến hạn (${className}): ${a.title}`,
          href: `/student/assignments/${a.id}`,
          dedupeKey: `due_soon:${a.id}:${a.dueAt.getTime()}:${id}`,
        })),
      );
      await tx.update(assignments).set({ dueSoonNotifiedAt: now }).where(eq(assignments.id, a.id));
    });
  }
  const overdue = await db
    .select({ a: assignments, className: classes.name })
    .from(assignments)
    .innerJoin(classes, eq(classes.id, assignments.classId))
    .where(and(eq(assignments.status, "PUBLISHED"), isNull(assignments.overdueNotifiedAt), lte(assignments.dueAt, now)));
  for (const { a, className } of overdue) {
    await db.transaction(async (tx) => {
      const pending = await studentsNotSubmitted(tx, a.id, a.classId);
      await notify(
        tx,
        pending.map((id) => ({
          recipientId: id,
          type: "ASSIGNMENT_OVERDUE" as const,
          title: `Đã quá hạn (${className}): ${a.title}`,
          href: `/student/assignments/${a.id}`,
          dedupeKey: `overdue:${a.id}:${a.dueAt.getTime()}:${id}`,
        })),
      );
      await tx.update(assignments).set({ overdueNotifiedAt: now }).where(eq(assignments.id, a.id));
    });
  }
  const emailed = await flushNotificationEmails();
  return { dueSoon: dueSoon.length, overdue: overdue.length, emailed };
}

/** Chạy mỗi phút: đăng bài theo lịch. */
export async function runScheduledPublishing() {
  return publishDueScheduled();
}

async function studentsNotSubmitted(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  assignmentId: string,
  classId: string,
) {
  const rows = await tx
    .select({ id: classMembers.userId })
    .from(classMembers)
    .leftJoin(submissions, and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, classMembers.userId)))
    .where(
      and(
        eq(classMembers.classId, classId),
        eq(classMembers.role, "STUDENT"),
        eq(classMembers.status, "ACTIVE"),
        sql`(${submissions.id} is null or ${submissions.status} = 'DRAFT')`,
      ),
    );
  return rows.map((r) => r.id);
}

let started = false;
/** Lịch chạy trong cùng process (MVP). Gọi từ instrumentation.ts. */
export function startScheduler() {
  if (started) return;
  started = true;
  const run = () =>
    scanDeadlines().catch((e) => console.error("[jobs] scanDeadlines lỗi", (e as Error).message));
  setTimeout(run, 10_000);
  setInterval(run, 15 * 60_000);
  setInterval(
    () => runScheduledPublishing().catch((e) => console.error("[jobs] đăng theo lịch lỗi", (e as Error).message)),
    60_000,
  );
}
