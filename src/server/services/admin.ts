import "server-only";
import { and, count, desc, eq, gt, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import { auditLogs, classes, notifications, sessions, submissions, userEvents, users } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { generateTempPassword, hashPassword } from "@/server/auth/password";
import { approveTeacherAccount, createTeacherByAdmin } from "@/server/auth/accounts";
import { notifyPasswordReset } from "./notifications";
import { revokeAllSessions } from "@/server/auth/session";
import { requireRole, isUuid } from "@/server/policy";
import { UserError } from "./errors";

/**
 * Quản trị: chỉ ADMIN. Admin quản lý TÀI KHOẢN, không đọc bài làm/điểm của học sinh (privacy).
 * Mọi thao tác ghi audit_logs.
 */

export async function adminStats(actor: Actor) {
  requireRole(actor, "ADMIN");
  // Chạy song song: mỗi truy vấn là một lượt đi về tới database.
  const [byRole, [cls], [subs], [pending]] = await Promise.all([
    db.select({ role: users.role, status: users.status, n: count() }).from(users).where(isNull(users.deletedAt)).groupBy(users.role, users.status),
    db.select({ n: count() }).from(classes).where(and(isNull(classes.deletedAt), eq(classes.status, "ACTIVE"))),
    db.select({ n: count() }).from(submissions).where(sql`${submissions.submittedAt} > now() - interval '7 days'`),
    db.select({ n: count() }).from(users).where(and(eq(users.role, "TEACHER"), isNull(users.approvedAt), eq(users.status, "ACTIVE"), isNull(users.deletedAt))),
  ]);
  const sum = (f: (r: (typeof byRole)[number]) => boolean) => byRole.filter(f).reduce((s, r) => s + r.n, 0);
  return {
    pendingTeachers: pending?.n ?? 0,
    admins: sum((r) => r.role === "ADMIN"),
    teachers: sum((r) => r.role === "TEACHER"),
    students: sum((r) => r.role === "STUDENT"),
    locked: sum((r) => r.status !== "ACTIVE"),
    activeClasses: cls?.n ?? 0,
    submissions7d: subs?.n ?? 0,
  };
}

const CHART_DAYS = 14;

/** Số liệu tổng hợp cho biểu đồ ở trang quản trị. Chỉ là số đếm, không có nội dung bài làm hay điểm. */
export async function adminCharts(actor: Actor) {
  requireRole(actor, "ADMIN");
  const day = (col: unknown) => sql<string>`to_char((${col} at time zone 'Asia/Ho_Chi_Minh')::date, 'YYYY-MM-DD')`;
  const [subDays, activeDays, statusRows, deviceRows, [today]] = await Promise.all([
    db
      .select({ d: day(submissions.submittedAt), n: count() })
      .from(submissions)
      .where(sql`${submissions.submittedAt} > now() - interval '15 days'`)
      .groupBy(sql`1`),
    db
      .select({ d: day(userEvents.at), n: sql<number>`count(distinct ${userEvents.userId})::int` })
      .from(userEvents)
      .where(sql`${userEvents.at} > now() - interval '15 days'`)
      .groupBy(sql`1`),
    db.select({ status: submissions.status, n: count() }).from(submissions).groupBy(submissions.status),
    db
      .select({ device: userEvents.device, n: sql<number>`count(distinct ${userEvents.userId})::int` })
      .from(userEvents)
      .where(sql`${userEvents.at} > now() - interval '30 days'`)
      .groupBy(userEvents.device),
    db.select({ d: sql<string>`to_char((now() at time zone 'Asia/Ho_Chi_Minh')::date, 'YYYY-MM-DD')` }).from(sql`(select 1) as t`),
  ]);
  // Dãy 14 ngày liên tục theo giờ Việt Nam, ngày không có số liệu = 0.
  const end = new Date(`${today.d}T00:00:00Z`);
  const days = Array.from({ length: CHART_DAYS }, (_, i) => new Date(end.getTime() - (CHART_DAYS - 1 - i) * 86400_000).toISOString().slice(0, 10));
  const pick = (rows: { d: string; n: number }[]) => days.map((d) => rows.find((r) => r.d === d)?.n ?? 0);
  const statusOf = (s: string) => statusRows.find((r) => r.status === s)?.n ?? 0;
  const deviceOf = (...keys: string[]) => deviceRows.filter((r) => keys.includes((r.device ?? "").toLowerCase())).reduce((s, r) => s + r.n, 0);
  const knownDevices = deviceOf("mobile", "desktop", "tablet");
  return {
    days: days.map((d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`),
    submissionsPerDay: pick(subDays),
    activeUsersPerDay: pick(activeDays),
    submissionStatus: { draft: statusOf("DRAFT"), submitted: statusOf("SUBMITTED"), graded: statusOf("GRADED"), returned: statusOf("RETURNED") },
    devices: { mobile: deviceOf("mobile"), desktop: deviceOf("desktop"), tablet: deviceOf("tablet"), other: deviceRows.reduce((s, r) => s + r.n, 0) - knownDevices },
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

/** GV tự đăng ký đang chờ duyệt (chưa bị khóa), cũ nhất lên trước. */
export async function listPendingTeachers(actor: Actor) {
  requireRole(actor, "ADMIN");
  return db
    .select({ id: users.id, fullName: users.fullName, username: users.username, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(and(eq(users.role, "TEACHER"), isNull(users.approvedAt), eq(users.status, "ACTIVE"), isNull(users.deletedAt)))
    .orderBy(users.createdAt)
    .limit(100);
}

/** Duyệt GV: từ giờ vào được phần giáo viên; báo cho GV bằng thông báo trong app. Từ chối = khóa tài khoản (setUserStatus DISABLED). */
export async function approveTeacher(actor: Actor, userId: string) {
  const u = await targetUser(actor, userId);
  if (u.role !== "TEACHER") notFound();
  if (u.approvedAt) return;
  if (!(await approveTeacherAccount(u.id))) return;
  await db
    .insert(notifications)
    .values({
      recipientId: u.id,
      type: "TEACHER_APPROVED",
      title: "Tài khoản giáo viên của bạn đã được duyệt. Bắt đầu bằng việc tạo lớp học đầu tiên.",
      href: "/teacher",
      dedupeKey: `teacher_approved:${u.id}`,
    })
    .onConflictDoNothing();
  await audit(actor, "user.approve_teacher", u.id);
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
  if (u.role === "ADMIN" && status !== "ACTIVE") {
    const [other] = await db
      .select({ n: count() })
      .from(users)
      .where(and(eq(users.role, "ADMIN"), eq(users.status, "ACTIVE"), isNull(users.deletedAt), ne(users.id, u.id)));
    if (!other?.n) throw new UserError("Phải còn ít nhất một quản trị viên đang hoạt động.");
  }
  await db
    .update(users)
    .set({ status, failedLogins: 0, lockedUntil: status === "ACTIVE" ? null : u.lockedUntil })
    .where(eq(users.id, u.id));
  if (status !== "ACTIVE") await revokeAllSessions(u.id);
  await audit(actor, `user.status.${status.toLowerCase()}`, u.id);
}

/**
 * Xóa mềm: giữ lại dữ liệu (bài nộp, lớp) nhưng tài khoản biến mất khỏi danh sách và không đăng nhập được.
 * Giải phóng username/email để người đó đăng ký lại được. Không xóa admin.
 */
export async function softDeleteUser(actor: Actor, userId: string) {
  const u = await targetUser(actor, userId);
  if (u.id === actor.id) throw new UserError("Không thể tự xóa tài khoản của chính mình.");
  if (u.role === "ADMIN") throw new UserError("Không xóa được tài khoản quản trị viên.");
  await db
    .update(users)
    .set({ deletedAt: new Date(), status: "DISABLED", username: `deleted.${u.id}`, email: null })
    .where(eq(users.id, u.id));
  await revokeAllSessions(u.id);
  await audit(actor, "user.delete", u.id);
}

/** Người dùng có phiên đăng nhập hoạt động trong `minutes` phút gần đây. */
export async function listOnlineUsers(actor: Actor, minutes = 15) {
  requireRole(actor, "ADMIN");
  const since = new Date(Date.now() - minutes * 60_000);
  return db
    .select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
      role: users.role,
      lastSeenAt: sql<Date>`max(${sessions.lastSeenAt})`.mapWith((v) => new Date(v)),
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(gt(sessions.lastSeenAt, since), gt(sessions.expiresAt, new Date()), isNull(users.deletedAt), eq(users.status, "ACTIVE")))
    .groupBy(users.id)
    .orderBy(desc(sql`max(${sessions.lastSeenAt})`))
    .limit(200);
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
  // Không cấp mật khẩu tạm cho admin khác: nếu không, một admin bị lộ mật khẩu sẽ chiếm được mọi tài khoản admin.
  if (u.role === "ADMIN") {
    throw new UserError("Không cấp lại mật khẩu cho quản trị viên khác. Quản trị viên dùng chức năng Quên mật khẩu hoặc script pnpm admin:create.");
  }
  const tempPassword = generateTempPassword();
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(tempPassword), mustChangePassword: true, failedLogins: 0, lockedUntil: null })
    .where(eq(users.id, u.id));
  await revokeAllSessions(u.id);
  await notifyPasswordReset(u.id, "Quản trị viên");
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
  const id = await createTeacherByAdmin(actor.id, input, tempPassword);
  const u = { id };
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
