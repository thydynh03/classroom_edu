import "server-only";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import { assignments, classMembers, classes, submissions } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";

/**
 * Policy layer: mọi truy cập tài nguyên theo lớp đi qua đây.
 * Không có quyền → notFound() (404), không lộ việc tài nguyên có tồn tại.
 */

export async function membershipOf(userId: string, classId: string) {
  const [m] = await db
    .select({ role: classMembers.role })
    .from(classMembers)
    .where(
      and(
        eq(classMembers.classId, classId),
        eq(classMembers.userId, userId),
        eq(classMembers.status, "ACTIVE"),
      ),
    )
    .limit(1);
  return m?.role ?? null;
}

export async function requireTeacherOfClass(actor: Actor, classId: string) {
  if (!isUuid(classId)) notFound();
  const [row] = await db
    .select({ cls: classes })
    .from(classes)
    .innerJoin(
      classMembers,
      and(
        eq(classMembers.classId, classes.id),
        eq(classMembers.userId, actor.id),
        eq(classMembers.role, "TEACHER"),
        eq(classMembers.status, "ACTIVE"),
      ),
    )
    .where(eq(classes.id, classId))
    .limit(1);
  if (!row || row.cls.deletedAt) notFound();
  return row.cls;
}

export async function requireStudentOfClass(actor: Actor, classId: string) {
  if (!isUuid(classId)) notFound();
  const [row] = await db
    .select({ cls: classes })
    .from(classes)
    .innerJoin(
      classMembers,
      and(
        eq(classMembers.classId, classes.id),
        eq(classMembers.userId, actor.id),
        eq(classMembers.role, "STUDENT"),
        eq(classMembers.status, "ACTIVE"),
      ),
    )
    .where(eq(classes.id, classId))
    .limit(1);
  if (!row || row.cls.deletedAt) notFound();
  return row.cls;
}

export async function requireAssignmentForTeacher(actor: Actor, assignmentId: string) {
  if (!isUuid(assignmentId)) notFound();
  const [row] = await db
    .select({ a: assignments, cls: classes })
    .from(assignments)
    .innerJoin(classes, eq(classes.id, assignments.classId))
    .innerJoin(
      classMembers,
      and(
        eq(classMembers.classId, assignments.classId),
        eq(classMembers.userId, actor.id),
        eq(classMembers.role, "TEACHER"),
        eq(classMembers.status, "ACTIVE"),
      ),
    )
    .where(eq(assignments.id, assignmentId))
    .limit(1);
  if (!row) notFound();
  return row;
}

/** Học sinh chỉ thấy bài đã đăng của lớp mình đang học. */
export async function requireAssignmentForStudent(actor: Actor, assignmentId: string) {
  if (!isUuid(assignmentId)) notFound();
  const [row] = await db
    .select({ a: assignments, cls: classes })
    .from(assignments)
    .innerJoin(classes, eq(classes.id, assignments.classId))
    .innerJoin(
      classMembers,
      and(
        eq(classMembers.classId, assignments.classId),
        eq(classMembers.userId, actor.id),
        eq(classMembers.role, "STUDENT"),
        eq(classMembers.status, "ACTIVE"),
      ),
    )
    .where(and(eq(assignments.id, assignmentId), eq(assignments.status, "PUBLISHED")))
    .limit(1);
  if (!row) notFound();
  return row;
}

export async function requireSubmissionForTeacher(actor: Actor, submissionId: string) {
  if (!isUuid(submissionId)) notFound();
  const [row] = await db
    .select({ s: submissions, a: assignments })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .innerJoin(
      classMembers,
      and(
        eq(classMembers.classId, assignments.classId),
        eq(classMembers.userId, actor.id),
        eq(classMembers.role, "TEACHER"),
        eq(classMembers.status, "ACTIVE"),
      ),
    )
    .where(eq(submissions.id, submissionId))
    .limit(1);
  if (!row) notFound();
  return row;
}

export function requireRole(actor: Actor, role: Actor["role"]) {
  if (actor.role !== role) notFound();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: string) {
  return UUID_RE.test(v);
}
