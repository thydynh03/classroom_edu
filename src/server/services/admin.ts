import "server-only";
import { and, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import { auditLogs, classes, submissions, users } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { generateTempPassword, hashPassword } from "@/server/auth/password";
import { revokeAllSessions } from "@/server/auth/session";
import { requireRole, isUuid } from "@/server/policy";
import { UserError } from "./errors";

/**
 * Quản trị: chỉ ADMIN. Admin quản lý TÀI KHOẢN, không đọc bài làm/điểm của học sinh (privacy).
 * Mọi thao tác ghi audit_logs.
 */

export async function adminStats(actor: Actor) {
  requireRole(actor, "ADMIN");
  const byRole = await db
    .select({ role: users.role, status: users.status, n: count() })
    .from(users)
    .where(isNull(users.deletedAt))
    .groupBy(users.role, users.status);
  const [cls] = await db.select({ n: count() }).from(classes).where(and(isNull(classes.deletedAt), eq(classes.status, "ACTIVE")));
  const [subs] = await db
    .select({ n: count() })
    .from(submissions)
    .where(sql`${submissions.submittedAt} > now() - interval '7 days'`);
  const sum = (f: (r: (typeof byRole)[number]) => boolean) => byRole.filter(f).reduce((s, r) => s + r.n, 0);
  return {
    teachers: sum((r) => r.role === "TEACHER"),
    students: sum((r) => r.role === "STUDENT"),
    locked: sum((r) => r.status !== "ACTIVE"),
    activeClasses: cls?.n ?? 0,
    submissions7d: subs?.n ?? 0,
  };
}

export async function listUsers(
  actor: Actor,
  opts: { q?: string; role?: "ADMIN" | "TEACHER" | "STUDENT"; status?: "ACTIVE" | "LOCKED" | "DISABLED"; page?: number },
) {
  requireRole(actor, "ADMIN");
  const pageSize = 50;
  const page = Math.max(1, opts.page ?? 1);
  const q = opts.q?.trim();
  const where = and(
    isNull(users.deletedAt),
    opts.role ? eq(users.role, opts.role) : undefined,
    opts.status ? eq(users.status, opts.status) : undefined,
    q
      ? or(
          ilike(users.username, `%${escapeLike(q)}%`),
          ilike(users.email, `%${escapeLike(q)}%`),
          sql`unaccent(${users.fullName}) ilike unaccent(${`%${escapeLike(q)}%`})`,
        )
      : undefined,
  );
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        email: users.email,
        role: users.role,
        status: users.status,
        mustChangePassword: users.mustChangePassword,
        lockedUntil: users.lockedUntil,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: count() }).from(users).where(where),
  ]);
  return { rows, total: total?.n ?? 0, page, pageSize };
}

function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

async function targetUser(actor: Actor, userId: string) {
  requireRole(actor, "ADMIN");
  if (!isUuid(userId)) notFound();
  const [u] = await db.select().from(users).where(and(eq(users.id, userId), isNull(users.deletedAt))).limit(1);
  if (!u) notFound();
  return u;
}

async function audit(actor: Actor, action: string, targetId: string, meta?: Record<string, unknown>) {
  await db.insert(auditLogs).values({ actorId: actor.id, action, targetType: "user", targetId, meta });
}

export async function setUserStatus(actor: Actor, userId: string, status: "ACTIVE" | "LOCKED" | "DISABLED") {
  const u = await targetUser(actor, userId);
  if (u.id === actor.id) throw new UserError("Không thể tự khóa tài khoản của chính mình.");
  await db
    .update(users)
    .set({ status, failedLogins: 0, lockedUntil: status === "ACTIVE" ? null : u.lockedUntil })
    .where(eq(users.id, u.id));
  if (status !== "ACTIVE") await revokeAllSessions(u.id);
  await audit(actor, `user.status.${status.toLowerCase()}`, u.id);
}

/** Mở khóa tạm thời do nhập sai mật khẩu nhiều lần. */
export async function clearLoginLock(actor: Actor, userId: string) {
  const u = await targetUser(actor, userId);
  await db.update(users).set({ failedLogins: 0, lockedUntil: null }).where(eq(users.id, u.id));
  await audit(actor, "user.unlock_login", u.id);
}

export async function adminResetPassword(actor: Actor, userId: string) {
  const u = await targetUser(actor, userId);
  if (u.id === actor.id) throw new UserError("Hãy đổi mật khẩu của chính bạn ở trang Tài khoản.");
  const tempPassword = generateTempPassword();
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(tempPassword), mustChangePassword: true, failedLogins: 0, lockedUntil: null })
    .where(eq(users.id, u.id));
  await revokeAllSessions(u.id);
  await audit(actor, "user.reset_password", u.id);
  return tempPassword;
}

/** Admin tạo tài khoản giáo viên (đã xác minh), mật khẩu tạm bắt đổi lần đầu. */
export async function createTeacher(actor: Actor, input: { fullName: string; username: string; email: string }) {
  requireRole(actor, "ADMIN");
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(or(sql`lower(${users.username}) = ${input.username}`, sql`lower(${users.email}) = ${input.email}`))
    .limit(1);
  if (taken) throw new UserError("Tên đăng nhập hoặc email đã được dùng.");
  const tempPassword = generateTempPassword();
  const [u] = await db
    .insert(users)
    .values({
      ...input,
      passwordHash: await hashPassword(tempPassword),
      role: "TEACHER",
      mustChangePassword: true,
      emailVerifiedAt: new Date(),
      createdBy: actor.id,
    })
    .returning({ id: users.id });
  await audit(actor, "user.create_teacher", u.id);
  return tempPassword;
}

export async function recentAudit(actor: Actor, limit = 100) {
  requireRole(actor, "ADMIN");
  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      createdAt: auditLogs.createdAt,
      actorName: users.fullName,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
