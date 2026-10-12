import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import { appSettings, auditLogs, featureGrants, notifications, upgradeRequests, users } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { isUuid, requireRole } from "@/server/policy";
import { appUrl, sendMail } from "@/server/mail";
import { featureByKey, PLANS, type FeatureKey, type PlanKey } from "@/lib/premium-features";
import { UserError } from "./errors";

/**
 * Luồng mở khóa tính năng nâng cao (mua theo từng GV):
 * GV xem mô tả → "Yêu cầu mở khóa" → admin nhận thông báo trong app + email → liên hệ, nhận thanh toán
 * → "Mở khóa" (có thời hạn hoặc vĩnh viễn) → GV nhận thông báo. Chặn quyền ở server bằng requireFeature.
 */

export type BillingInfo = { priceText: string; paymentInfo: string };
const BILLING_DEFAULT: BillingInfo = {
  priceText: "Liên hệ quản trị viên để biết giá.",
  paymentInfo: "",
};

export async function getBilling(): Promise<BillingInfo> {
  const [row] = await db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, "billing"));
  return { ...BILLING_DEFAULT, ...(row?.value as Partial<BillingInfo> | undefined) };
}

export async function updateBilling(actor: Actor, input: BillingInfo) {
  requireRole(actor, "ADMIN");
  await db
    .insert(appSettings)
    .values({ key: "billing", value: input, updatedBy: actor.id })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: input, updatedBy: actor.id, updatedAt: new Date() } });
  await db.insert(auditLogs).values({ actorId: actor.id, action: "settings.billing", targetType: "settings", targetId: "billing" });
}

/** Email nhận báo yêu cầu: email của admin đang hoạt động + ADMIN_NOTIFY_EMAILS. */
async function adminRecipients() {
  const admins = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(and(eq(users.role, "ADMIN"), eq(users.status, "ACTIVE"), isNull(users.deletedAt)));
  const extra = (process.env.ADMIN_NOTIFY_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^@\s]+@[^@\s]+$/.test(e));
  const emails = [...new Set([...admins.map((a) => a.email?.toLowerCase()).filter((e): e is string => !!e), ...extra])];
  return { adminIds: admins.map((a) => a.id), emails };
}

export async function requestUpgrade(
  actor: Actor,
  input: { featureKey: FeatureKey; plan: PlanKey; contact?: string; note?: string },
) {
  if (actor.role !== "TEACHER") notFound();
  const feature = featureByKey(input.featureKey);
  if (!feature) throw new UserError("Tính năng không tồn tại.");
  const plan: PlanKey = feature.comingSoon ? "INTEREST" : input.plan === "INTEREST" ? "MONTH" : input.plan;
  const [created] = await db
    .insert(upgradeRequests)
    .values({ requesterId: actor.id, featureKey: feature.key, plan, contact: input.contact || null, note: input.note || null })
    .onConflictDoNothing()
    .returning({ id: upgradeRequests.id });
  if (!created) throw new UserError("Bạn đã gửi yêu cầu cho tính năng này. Quản trị viên sẽ liên hệ sớm.");

  const { adminIds, emails } = await adminRecipients();
  const title = `${actor.fullName} yêu cầu mở khóa: ${feature.title} (${PLANS[plan]})`;
  if (adminIds.length) {
    await db
      .insert(notifications)
      .values(adminIds.map((id) => ({ recipientId: id, type: "UPGRADE_REQUEST", title, href: "/admin/upgrades", dedupeKey: `upgrade:${created.id}:${id}` })))
      .onConflictDoNothing();
  }
  // Email báo admin gửi ngay (không chờ job, không áp giờ yên tĩnh); lỗi email không làm hỏng yêu cầu.
  const [me] = await db.select({ email: users.email, username: users.username }).from(users).where(eq(users.id, actor.id));
  const text = [
    `Giáo viên: ${actor.fullName} (${me?.username ?? ""}${me?.email ? `, ${me.email}` : ""})`,
    `Tính năng: ${feature.title}`,
    `Gói: ${PLANS[plan]}`,
    input.contact ? `Liên hệ: ${input.contact}` : "",
    input.note ? `Ghi chú: ${input.note}` : "",
    "",
    `Xử lý tại: ${appUrl("/admin/upgrades")}`,
  ]
    .filter(Boolean)
    .join("\n");
  for (const to of emails) await sendMail(to, `[Classroom Edu] ${title}`, text, "admin");
  await db.insert(auditLogs).values({ actorId: actor.id, action: "upgrade.request", targetType: "upgrade_request", targetId: created.id, meta: { featureKey: feature.key, plan } });
  return created.id;
}

/** Trạng thái các tính năng của GV (cho trang Nâng cao). */
export async function myUpgradeState(actor: Actor) {
  if (actor.role !== "TEACHER") return { requests: [], grants: [] };
  const [requests, grants] = await Promise.all([
    db
      .select({ featureKey: upgradeRequests.featureKey, status: upgradeRequests.status, createdAt: upgradeRequests.createdAt })
      .from(upgradeRequests)
      .where(and(eq(upgradeRequests.requesterId, actor.id), inArray(upgradeRequests.status, ["NEW", "CONTACTED"]))),
    db
      .select({ featureKey: featureGrants.featureKey, expiresAt: featureGrants.expiresAt })
      .from(featureGrants)
      .where(and(eq(featureGrants.userId, actor.id), isNull(featureGrants.revokedAt), sql`(${featureGrants.expiresAt} is null or ${featureGrants.expiresAt} > now())`)),
  ]);
  return { requests, grants };
}

export async function cancelMyRequest(actor: Actor, featureKey: string) {
  if (actor.role !== "TEACHER") notFound();
  await db
    .update(upgradeRequests)
    .set({ status: "CANCELLED", handledAt: new Date() })
    .where(and(eq(upgradeRequests.requesterId, actor.id), eq(upgradeRequests.featureKey, featureKey), inArray(upgradeRequests.status, ["NEW", "CONTACTED"])));
}

// ---------------------------------------------------------------- Admin

export async function listUpgradeRequests(actor: Actor, opts: { open?: boolean } = {}) {
  requireRole(actor, "ADMIN");
  return db
    .select({
      id: upgradeRequests.id,
      featureKey: upgradeRequests.featureKey,
      plan: upgradeRequests.plan,
      contact: upgradeRequests.contact,
      note: upgradeRequests.note,
      status: upgradeRequests.status,
      adminNote: upgradeRequests.adminNote,
      createdAt: upgradeRequests.createdAt,
      handledAt: upgradeRequests.handledAt,
      teacherId: users.id,
      teacherName: users.fullName,
      username: users.username,
      email: users.email,
    })
    .from(upgradeRequests)
    .innerJoin(users, eq(users.id, upgradeRequests.requesterId))
    .where(opts.open ? inArray(upgradeRequests.status, ["NEW", "CONTACTED"]) : undefined)
    .orderBy(desc(upgradeRequests.createdAt))
    .limit(200);
}

export async function listActiveGrants(actor: Actor) {
  requireRole(actor, "ADMIN");
  return db
    .select({
      id: featureGrants.id,
      featureKey: featureGrants.featureKey,
      expiresAt: featureGrants.expiresAt,
      createdAt: featureGrants.createdAt,
      teacherName: users.fullName,
      username: users.username,
    })
    .from(featureGrants)
    .innerJoin(users, eq(users.id, featureGrants.userId))
    .where(and(isNull(featureGrants.revokedAt), sql`(${featureGrants.expiresAt} is null or ${featureGrants.expiresAt} > now())`))
    .orderBy(desc(featureGrants.createdAt))
    .limit(500);
}

export async function markContacted(actor: Actor, requestId: string, adminNote?: string) {
  requireRole(actor, "ADMIN");
  if (!isUuid(requestId)) notFound();
  const rows = await db
    .update(upgradeRequests)
    .set({ status: "CONTACTED", adminNote: adminNote || null, handledBy: actor.id, handledAt: new Date() })
    .where(and(eq(upgradeRequests.id, requestId), eq(upgradeRequests.status, "NEW")))
    .returning({ id: upgradeRequests.id });
  if (!rows.length) notFound();
}

export async function rejectRequest(actor: Actor, requestId: string, adminNote?: string) {
  requireRole(actor, "ADMIN");
  if (!isUuid(requestId)) notFound();
  const rows = await db
    .update(upgradeRequests)
    .set({ status: "REJECTED", adminNote: adminNote || null, handledBy: actor.id, handledAt: new Date() })
    .where(and(eq(upgradeRequests.id, requestId), inArray(upgradeRequests.status, ["NEW", "CONTACTED"])))
    .returning({ id: upgradeRequests.id });
  if (!rows.length) notFound();
  await db.insert(auditLogs).values({ actorId: actor.id, action: "upgrade.reject", targetType: "upgrade_request", targetId: requestId });
}

/**
 * Mở khóa cho một GV. months = null → không thời hạn. Gắn với yêu cầu (nếu có) và báo cho GV.
 * Gia hạn: nếu đang còn hạn thì cộng tiếp từ ngày hết hạn hiện tại.
 */
export async function grantFeature(
  actor: Actor,
  input: { userId?: string; username?: string; featureKey: FeatureKey; months: number | null; requestId?: string },
) {
  requireRole(actor, "ADMIN");
  const feature = featureByKey(input.featureKey);
  if (!feature || feature.comingSoon) throw new UserError("Tính năng này chưa mở bán.");
  let requestId: string | null = null;
  if (input.requestId) {
    if (!isUuid(input.requestId)) notFound();
    const [r] = await db
      .select({ requesterId: upgradeRequests.requesterId, featureKey: upgradeRequests.featureKey })
      .from(upgradeRequests)
      .where(and(eq(upgradeRequests.id, input.requestId), inArray(upgradeRequests.status, ["NEW", "CONTACTED"])));
    if (!r || r.featureKey !== feature.key) notFound();
    requestId = input.requestId;
    input.userId = r.requesterId;
  }
  const where = input.userId
    ? isUuid(input.userId)
      ? eq(users.id, input.userId)
      : undefined
    : input.username
      ? sql`lower(${users.username}) = ${input.username.trim().toLowerCase()}`
      : undefined;
  if (!where) notFound();
  const [teacher] = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email })
    .from(users)
    .where(and(where, eq(users.role, "TEACHER"), isNull(users.deletedAt)));
  if (!teacher) throw new UserError("Không tìm thấy giáo viên này.");

  const now = new Date();
  const current = (
    await db
      .select({ id: featureGrants.id, expiresAt: featureGrants.expiresAt })
      .from(featureGrants)
      .where(and(eq(featureGrants.userId, teacher.id), eq(featureGrants.featureKey, feature.key), isNull(featureGrants.revokedAt)))
  ).find((g) => !g.expiresAt || g.expiresAt > now);
  if (current && !current.expiresAt) throw new UserError("Giáo viên này đã được mở khóa không thời hạn.");
  const from = current?.expiresAt ?? now;
  const expiresAt = input.months === null ? null : new Date(new Date(from).setMonth(from.getMonth() + input.months));

  await db.transaction(async (tx) => {
    if (current) await tx.update(featureGrants).set({ revokedAt: now }).where(eq(featureGrants.id, current.id));
    await tx.insert(featureGrants).values({ userId: teacher.id, featureKey: feature.key, grantedBy: actor.id, expiresAt, requestId });
    if (requestId) {
      await tx.update(upgradeRequests).set({ status: "GRANTED", handledBy: actor.id, handledAt: now }).where(eq(upgradeRequests.id, requestId));
    }
    await tx
      .insert(notifications)
      .values({
        recipientId: teacher.id,
        type: "FEATURE_GRANTED",
        title: `Đã mở khóa: ${feature.title}${expiresAt ? ` (đến ${expiresAt.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })})` : ""}`,
        href: "/teacher/upgrade",
        dedupeKey: `grant:${teacher.id}:${feature.key}:${now.getTime()}`,
      })
      .onConflictDoNothing();
    await tx.insert(auditLogs).values({
      actorId: actor.id,
      action: "feature.grant",
      targetType: "user",
      targetId: teacher.id,
      meta: { featureKey: feature.key, months: input.months, requestId },
    });
  });
  if (teacher.email) {
    await sendMail(teacher.email, `[Classroom Edu] Đã mở khóa ${feature.title}`, `Chào ${teacher.fullName},\n\nTính năng "${feature.title}" đã được mở khóa cho tài khoản của bạn.\n${appUrl("/teacher/upgrade")}`, "transactional");
  }
  return { expiresAt };
}

export async function revokeGrant(actor: Actor, grantId: string) {
  requireRole(actor, "ADMIN");
  if (!isUuid(grantId)) notFound();
  const rows = await db
    .update(featureGrants)
    .set({ revokedAt: new Date() })
    .where(and(eq(featureGrants.id, grantId), isNull(featureGrants.revokedAt)))
    .returning({ userId: featureGrants.userId, featureKey: featureGrants.featureKey });
  if (!rows.length) notFound();
  await db.insert(auditLogs).values({ actorId: actor.id, action: "feature.revoke", targetType: "user", targetId: rows[0].userId, meta: { featureKey: rows[0].featureKey } });
}
