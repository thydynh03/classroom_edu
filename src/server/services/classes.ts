import "server-only";
import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import {
  assignments,
  auditLogs,
  classMembers,
  classes,
  submissions,
  users,
  type ClassColor,
} from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { requireStudentOfClass, requireTeacherOfClass } from "@/server/policy";
import { generateTempPassword, hashPassword } from "@/server/auth/password";
import { revokeAllSessions } from "@/server/auth/session";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // bỏ 0/O, 1/I/L
export function generateJoinCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

/** Bỏ dấu tiếng Việt, tạo username gợi ý: "Lê Hoàng Anh" → "lehoanganh". */
export function slugifyName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24);
}

export async function listTeacherClasses(actor: Actor) {
  const rows = await db
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
    .where(isNull(classes.deletedAt))
    .orderBy(asc(classes.status), asc(classes.name));
  const ids = rows.map((r) => r.cls.id);
  const studentCounts = ids.length
    ? await db
        .select({ classId: classMembers.classId, n: count() })
        .from(classMembers)
        .where(
          and(
            inArray(classMembers.classId, ids),
            eq(classMembers.role, "STUDENT"),
            eq(classMembers.status, "ACTIVE"),
          ),
        )
        .groupBy(classMembers.classId)
    : [];
  const openCounts = ids.length
    ? await db
        .select({ classId: assignments.classId, n: count() })
        .from(assignments)
        .where(and(inArray(assignments.classId, ids), eq(assignments.status, "PUBLISHED"), sql`${assignments.dueAt} > now()`))
        .groupBy(assignments.classId)
    : [];
  return rows.map(({ cls }) => ({
    ...cls,
    studentCount: studentCounts.find((c) => c.classId === cls.id)?.n ?? 0,
    openCount: openCounts.find((c) => c.classId === cls.id)?.n ?? 0,
  }));
}

export async function listStudentClasses(actor: Actor) {
  return db
    .select({
      id: classes.id,
      name: classes.name,
      subject: classes.subject,
      color: classes.color,
      teacherName: users.fullName,
    })
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
    .innerJoin(users, eq(users.id, classes.ownerId))
    .where(and(isNull(classes.deletedAt), eq(classes.status, "ACTIVE")))
    .orderBy(asc(classes.name));
}

export async function createClass(
  actor: Actor,
  input: { name: string; subject: string; schoolYear?: string; color: ClassColor },
) {
  return db.transaction(async (tx) => {
    const [cls] = await tx
      .insert(classes)
      .values({ ...input, ownerId: actor.id, joinCode: generateJoinCode() })
      .returning();
    await tx.insert(classMembers).values({ classId: cls.id, userId: actor.id, role: "TEACHER" });
    return cls;
  });
}

export async function updateClass(
  actor: Actor,
  classId: string,
  input: { name: string; subject: string; schoolYear?: string; color: ClassColor },
) {
  await requireTeacherOfClass(actor, classId);
  await db.update(classes).set(input).where(eq(classes.id, classId));
}

export async function setClassArchived(actor: Actor, classId: string, archived: boolean) {
  await requireTeacherOfClass(actor, classId);
  await db
    .update(classes)
    .set({ status: archived ? "ARCHIVED" : "ACTIVE" })
    .where(eq(classes.id, classId));
}

export async function regenerateJoinCode(actor: Actor, classId: string) {
  await requireTeacherOfClass(actor, classId);
  await db.update(classes).set({ joinCode: generateJoinCode() }).where(eq(classes.id, classId));
}

export async function setJoinEnabled(actor: Actor, classId: string, enabled: boolean) {
  await requireTeacherOfClass(actor, classId);
  await db.update(classes).set({ joinEnabled: enabled }).where(eq(classes.id, classId));
}

export async function listClassStudents(actor: Actor, classId: string) {
  await requireTeacherOfClass(actor, classId);
  return db
    .select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
      email: users.email,
      status: users.status,
      mustChangePassword: users.mustChangePassword,
      joinedAt: classMembers.joinedAt,
    })
    .from(classMembers)
    .innerJoin(users, eq(users.id, classMembers.userId))
    .where(
      and(
        eq(classMembers.classId, classId),
        eq(classMembers.role, "STUDENT"),
        eq(classMembers.status, "ACTIVE"),
      ),
    )
    .orderBy(asc(users.fullName));
}

/** Tên học sinh cùng lớp (cho học sinh xem): chỉ tên, không username/email. */
export async function listClassmateNames(actor: Actor, classId: string) {
  await requireStudentOfClass(actor, classId);
  const rows = await db
    .select({ fullName: users.fullName })
    .from(classMembers)
    .innerJoin(users, eq(users.id, classMembers.userId))
    .where(and(eq(classMembers.classId, classId), eq(classMembers.role, "STUDENT"), eq(classMembers.status, "ACTIVE")))
    .orderBy(asc(users.fullName));
  return rows.map((r) => r.fullName);
}

async function uniqueUsername(base: string, taken: Set<string>) {
  const root = base || "hocsinh";
  for (let i = 0; i < 1000; i++) {
    const candidate = i === 0 ? root : `${root}${i + 1}`;
    if (taken.has(candidate)) continue;
    const [exists] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.username}) = ${candidate}`)
      .limit(1);
    if (!exists) {
      taken.add(candidate);
      return candidate;
    }
  }
  throw new Error("Không tạo được tên đăng nhập");
}

/**
 * Tạo tài khoản học sinh hàng loạt từ danh sách họ tên (mỗi dòng một em) và thêm vào lớp.
 * Trả về mật khẩu tạm MỘT LẦN để giáo viên phát cho học sinh; DB chỉ lưu hash.
 */
export async function bulkCreateStudents(actor: Actor, classId: string, names: string[]) {
  await requireTeacherOfClass(actor, classId);
  const clean = names.map((n) => n.trim().replace(/\s+/g, " ")).filter((n) => n.length >= 2).slice(0, 100);
  const taken = new Set<string>();
  const created: { fullName: string; username: string; tempPassword: string }[] = [];
  for (const fullName of clean) {
    const username = await uniqueUsername(slugifyName(fullName), taken);
    const tempPassword = generateTempPassword();
    await db.transaction(async (tx) => {
      const [u] = await tx
        .insert(users)
        .values({
          fullName,
          username,
          passwordHash: await hashPassword(tempPassword),
          role: "STUDENT",
          mustChangePassword: true,
          createdBy: actor.id,
        })
        .returning({ id: users.id });
      await tx.insert(classMembers).values({ classId, userId: u.id, role: "STUDENT" });
    });
    created.push({ fullName, username, tempPassword });
  }
  await db.insert(auditLogs).values({
    actorId: actor.id,
    action: "students.bulk_create",
    targetType: "class",
    targetId: classId,
    meta: { count: created.length },
  });
  return created;
}

/** Thêm học sinh đã có tài khoản vào lớp bằng tên đăng nhập. */
export async function addExistingStudent(actor: Actor, classId: string, username: string) {
  await requireTeacherOfClass(actor, classId);
  const [u] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(and(sql`lower(${users.username}) = ${username.toLowerCase()}`, isNull(users.deletedAt)))
    .limit(1);
  if (!u || u.role !== "STUDENT") return false;
  await db
    .insert(classMembers)
    .values({ classId, userId: u.id, role: "STUDENT" })
    .onConflictDoUpdate({
      target: [classMembers.classId, classMembers.userId],
      set: { status: "ACTIVE" },
    });
  return true;
}

export async function removeStudent(actor: Actor, classId: string, studentId: string) {
  await requireTeacherOfClass(actor, classId);
  // Giữ lại bài đã nộp; chỉ đánh dấu rời lớp.
  await db
    .update(classMembers)
    .set({ status: "REMOVED" })
    .where(
      and(
        eq(classMembers.classId, classId),
        eq(classMembers.userId, studentId),
        eq(classMembers.role, "STUDENT"),
      ),
    );
}

/** GV của lớp cấp lại mật khẩu tạm cho học sinh (học sinh không có email). */
export async function resetStudentPassword(actor: Actor, classId: string, studentId: string) {
  await requireTeacherOfClass(actor, classId);
  const [m] = await db
    .select({ userId: classMembers.userId })
    .from(classMembers)
    .where(
      and(
        eq(classMembers.classId, classId),
        eq(classMembers.userId, studentId),
        eq(classMembers.role, "STUDENT"),
        eq(classMembers.status, "ACTIVE"),
      ),
    )
    .limit(1);
  if (!m) notFound();
  const tempPassword = generateTempPassword();
  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
      failedLogins: 0,
      lockedUntil: null,
    })
    .where(eq(users.id, studentId));
  await revokeAllSessions(studentId);
  await db.insert(auditLogs).values({
    actorId: actor.id,
    action: "student.reset_password",
    targetType: "user",
    targetId: studentId,
  });
  return tempPassword;
}

export async function findClassByCode(code: string) {
  const [cls] = await db
    .select({
      id: classes.id,
      name: classes.name,
      subject: classes.subject,
      joinEnabled: classes.joinEnabled,
      status: classes.status,
      teacherName: users.fullName,
    })
    .from(classes)
    .innerJoin(users, eq(users.id, classes.ownerId))
    .where(and(eq(classes.joinCode, code.toUpperCase()), isNull(classes.deletedAt)))
    .limit(1);
  if (!cls || !cls.joinEnabled || cls.status !== "ACTIVE") return null;
  return cls;
}

export async function joinClass(userId: string, classId: string) {
  await db
    .insert(classMembers)
    .values({ classId, userId, role: "STUDENT" })
    .onConflictDoUpdate({
      target: [classMembers.classId, classMembers.userId],
      set: { status: "ACTIVE" },
    });
}

/** Số liệu nộp bài theo từng bài của lớp (cho GV). */
export async function classAssignmentsWithStats(actor: Actor, classId: string) {
  await requireTeacherOfClass(actor, classId);
  const list = await db
    .select()
    .from(assignments)
    .where(and(eq(assignments.classId, classId)))
    .orderBy(desc(assignments.dueAt));
  return withStats(classId, list);
}

export async function withStats<T extends { id: string; classId: string }>(classId: string | null, list: T[]) {
  if (!list.length) return [];
  const ids = list.map((a) => a.id);
  const agg = await db
    .select({
      assignmentId: submissions.assignmentId,
      status: submissions.status,
      late: submissions.isLate,
      n: count(),
    })
    .from(submissions)
    .where(inArray(submissions.assignmentId, ids))
    .groupBy(submissions.assignmentId, submissions.status, submissions.isLate);
  const classIds = classId ? [classId] : [...new Set(list.map((a) => a.classId))];
  const totals = await db
    .select({ classId: classMembers.classId, n: count() })
    .from(classMembers)
    .where(and(inArray(classMembers.classId, classIds), eq(classMembers.role, "STUDENT"), eq(classMembers.status, "ACTIVE")))
    .groupBy(classMembers.classId);
  return list.map((a) => {
    const rows = agg.filter((r) => r.assignmentId === a.id);
    const sum = (f: (r: (typeof rows)[number]) => boolean) => rows.filter(f).reduce((s, r) => s + r.n, 0);
    const submitted = sum((r) => r.status !== "DRAFT");
    const graded = sum((r) => r.status === "GRADED" || r.status === "RETURNED");
    const late = sum((r) => r.status !== "DRAFT" && r.late);
    const total = totals.find((t) => t.classId === a.classId)?.n ?? 0;
    return {
      ...a,
      stats: {
        total,
        submitted,
        graded,
        pending: submitted - graded,
        late,
        missing: Math.max(0, total - submitted),
      },
    };
  });
}
