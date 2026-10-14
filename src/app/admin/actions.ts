"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActor, requireRecentAuth } from "@/server/auth/guard";
import { markReauthenticated } from "@/server/auth/session";
import { verifyPassword } from "@/server/auth/password";
import { db } from "@/server/db/client";
import { auditLogs, users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit } from "@/server/rate-limit";
import * as admin from "@/server/services/admin";
import * as settings from "@/server/services/settings";
import * as upgrades from "@/server/services/upgrades";
import { FEATURE_KEYS } from "@/lib/premium-features";
import { UserError } from "@/server/services/errors";
import { usernameSchema } from "@/server/validation/auth";
import { type ActionState, fieldErrorsFrom } from "@/lib/action";

const adminActor = () => requireActor("ADMIN");

async function wrap<T>(fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function setStatusAction(userId: string, status: "ACTIVE" | "LOCKED" | "DISABLED") {
  const actor = await adminActor();
  const parsed = z.enum(["ACTIVE", "LOCKED", "DISABLED"]).safeParse(status);
  if (!parsed.success) return { ok: false as const, error: "Trạng thái không hợp lệ" };
  const r = await wrap(async () => {
    if (parsed.data !== "ACTIVE") requireRecentAuth(actor);
    return admin.setUserStatus(actor, userId, parsed.data);
  });
  revalidatePath("/admin");
  return r;
}

export async function approveTeacherAction(userId: string) {
  const actor = await adminActor();
  const r = await wrap(async () => {
    requireRecentAuth(actor);
    return admin.approveTeacher(actor, userId);
  });
  revalidatePath("/admin");
  return r;
}

export async function deleteUserAction(userId: string) {
  const actor = await adminActor();
  const r = await wrap(async () => {
    requireRecentAuth(actor);
    return admin.softDeleteUser(actor, userId);
  });
  revalidatePath("/admin");
  return r;
}

export async function clearLockAction(userId: string) {
  const actor = await adminActor();
  await admin.clearLoginLock(actor, userId);
  revalidatePath("/admin");
}

export async function resetPasswordAction(userId: string) {
  const actor = await adminActor();
  return wrap(async () => {
    requireRecentAuth(actor);
    return admin.adminResetPassword(actor, userId);
  });
}

const teacherSchema = z.strictObject({
  fullName: z.string().trim().min(2, "Nhập họ tên").max(100),
  username: usernameSchema,
  email: z.email("Email không hợp lệ").trim().toLowerCase(),
});

export type CreateTeacherState = ActionState & { tempPassword?: string; username?: string };

export async function createTeacherAction(_: CreateTeacherState, fd: FormData): Promise<CreateTeacherState> {
  const actor = await adminActor();
  const parsed = teacherSchema.safeParse({
    fullName: String(fd.get("fullName") ?? ""),
    username: String(fd.get("username") ?? ""),
    email: String(fd.get("email") ?? ""),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const r = await wrap(async () => {
    requireRecentAuth(actor);
    return admin.createTeacher(actor, parsed.data);
  });
  if (!r.ok) return { error: r.error };
  revalidatePath("/admin");
  return { ok: true, tempPassword: r.value, username: parsed.data.username };
}

const keepaliveSchema = z.strictObject({
  enabled: z.boolean(),
  intervalHours: z.coerce
    .number()
    .int("Chu kỳ là số giờ nguyên")
    .min(settings.KEEPALIVE_MIN_HOURS, `Tối thiểu ${settings.KEEPALIVE_MIN_HOURS} giờ`)
    .max(settings.KEEPALIVE_MAX_HOURS, `Tối đa ${settings.KEEPALIVE_MAX_HOURS} giờ (6 ngày) để luôn dưới mốc 7 ngày của Supabase`),
});

export async function saveKeepaliveAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await adminActor();
  const parsed = keepaliveSchema.safeParse({ enabled: fd.get("enabled") === "on", intervalHours: String(fd.get("intervalHours") ?? "") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  await settings.updateKeepalive(actor, parsed.data);
  revalidatePath("/admin/settings");
  return { ok: true, message: "Đã lưu cài đặt." };
}

export async function pingNowAction(): Promise<ActionState> {
  const actor = await adminActor();
  const r = await settings.runKeepalive({ force: true, actor });
  revalidatePath("/admin/settings");
  return r.ran && r.ok ? { ok: true, message: "Đã ping database thành công." } : { error: "Ping database thất bại. Xem log Vercel." };
}

// ---------------------------------------------------------------- Nâng cấp / mở khóa

const idSchema = z.uuid();

export async function markContactedAction(requestId: string, adminNote?: string) {
  const actor = await adminActor();
  if (!idSchema.safeParse(requestId).success) return { ok: false as const, error: "Không hợp lệ" };
  const r = await wrap(() => upgrades.markContacted(actor, requestId, adminNote?.slice(0, 500)));
  revalidatePath("/admin/upgrades");
  return r;
}

export async function rejectRequestAction(requestId: string, adminNote?: string) {
  const actor = await adminActor();
  if (!idSchema.safeParse(requestId).success) return { ok: false as const, error: "Không hợp lệ" };
  const r = await wrap(() => upgrades.rejectRequest(actor, requestId, adminNote?.slice(0, 500)));
  revalidatePath("/admin/upgrades");
  return r;
}

const grantSchema = z.strictObject({
  requestId: z.uuid().optional(),
  username: z.string().trim().min(1).max(64).optional(),
  featureKey: z.enum(FEATURE_KEYS),
  months: z.enum(["1", "3", "6", "12", "forever"]),
});

export async function grantFeatureAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await adminActor();
  const parsed = grantSchema.safeParse({
    requestId: String(fd.get("requestId") ?? "") || undefined,
    username: String(fd.get("username") ?? "") || undefined,
    featureKey: String(fd.get("featureKey") ?? ""),
    months: String(fd.get("months") ?? "1"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  if (!parsed.data.requestId && !parsed.data.username) return { fieldErrors: { username: "Nhập tên đăng nhập của giáo viên" } };
  const months = parsed.data.months === "forever" ? null : Number(parsed.data.months);
  const r = await wrap(async () => {
    requireRecentAuth(actor);
    return upgrades.grantFeature(actor, { ...parsed.data, months });
  });
  if (!r.ok) return { error: r.error };
  revalidatePath("/admin/upgrades");
  return { ok: true, message: "Đã mở khóa và báo cho giáo viên." };
}

export async function revokeGrantAction(grantId: string) {
  const actor = await adminActor();
  if (!idSchema.safeParse(grantId).success) return { ok: false as const, error: "Không hợp lệ" };
  const r = await wrap(async () => {
    requireRecentAuth(actor);
    return upgrades.revokeGrant(actor, grantId);
  });
  revalidatePath("/admin/upgrades");
  return r;
}

const billingSchema = z.strictObject({
  priceText: z.string().trim().min(1, "Nhập giá hoặc \"Liên hệ\"").max(300),
  paymentInfo: z.string().trim().max(1000),
});

export async function saveBillingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await adminActor();
  const parsed = billingSchema.safeParse({ priceText: String(fd.get("priceText") ?? ""), paymentInfo: String(fd.get("paymentInfo") ?? "") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  await upgrades.updateBilling(actor, parsed.data);
  revalidatePath("/admin/settings");
  return { ok: true, message: "Đã lưu thông tin giá và thanh toán." };
}

/** Nhập lại mật khẩu để mở thao tác nhạy cảm trong 15 phút (step-up). */
export async function reauthAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await adminActor();
  const password = String(fd.get("password") ?? "");
  if (!password) return { fieldErrors: { password: "Nhập mật khẩu" } };
  if (!(await rateLimit(`reauth:${actor.id}`, 10, 15 * 60_000))) return { error: "Bạn thử quá nhiều lần. Đợi 15 phút." };
  const [u] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, actor.id));
  if (!u || !(await verifyPassword(u.passwordHash, password))) return { fieldErrors: { password: "Mật khẩu không đúng" } };
  await markReauthenticated(actor.sessionId);
  await db.insert(auditLogs).values({ actorId: actor.id, action: "admin.reauth", targetType: "session", targetId: actor.sessionId });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Đã xác nhận. Thao tác nhạy cảm mở trong 15 phút." };
}
