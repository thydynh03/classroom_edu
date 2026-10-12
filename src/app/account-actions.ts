"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db/client";
import { sessions, users } from "@/server/db/schema";
import { getActor, createSession } from "@/server/auth/session";
import { requireActor } from "@/server/auth/guard";
import { signupStudent } from "@/server/auth/accounts";
import { deletePushSubscription, savePushSubscription, sendTestPush } from "@/server/services/push";
import { markAllRead } from "@/server/services/notifications";
import { findClassByCode, joinClass } from "@/server/services/classes";
import { rateLimit } from "@/server/rate-limit";
import { passwordSchema, usernameSchema } from "@/server/validation/auth";
import { type ActionState, fieldErrorsFrom, formToObject } from "@/lib/action";
import { clientIp } from "@/server/client-ip";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";

/** Xem xong hoặc bỏ qua hướng dẫn lần đầu: lưu lại để lần sau không tự hiện. */
export async function completeTourAction() {
  const actor = await requireActor();
  await db.update(users).set({ tourCompletedAt: new Date() }).where(eq(users.id, actor.id));
}

export async function markAllReadAction() {
  const actor = await requireActor();
  await markAllRead(actor.id);
  revalidatePath("/", "layout");
}

export async function revokeSessionAction(sessionId: string) {
  const actor = await requireActor(undefined, { allowPending: true });
  if (sessionId === actor.sessionId) return;
  await db.delete(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.userId, actor.id)));
  revalidatePath("/settings");
}

/** Học sinh đã đăng nhập tham gia lớp bằng mã. */
export async function joinWithCodeAction(code: string): Promise<ActionState> {
  const actor = await getActor();
  if (!actor) redirect(`/join/${encodeURIComponent(code)}`);
  if (actor.role !== "STUDENT") return { error: "Chỉ tài khoản học sinh mới tham gia lớp bằng mã." };
  if (!(await rateLimit(`join:${actor.id}`, 20, 15 * 60_000))) return { error: "Bạn thử quá nhiều lần. Đợi một lát." };
  const cls = await findClassByCode(code);
  if (!cls) return { error: "Mã lớp không đúng hoặc lớp đã tắt tham gia bằng mã." };
  await joinClass(actor.id, cls.id);
  redirect(`/student/classes/${cls.id}`);
}

const joinSignupSchema = z.strictObject({
  code: z.string().min(4).max(16),
  fullName: z.string().trim().min(2, "Nhập họ tên").max(100),
  username: usernameSchema,
  password: passwordSchema,
});

/** Học sinh mới: tạo tài khoản và tham gia lớp trong một bước. */
export async function joinSignupAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = joinSignupSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const ip = await clientIp();
  if (!(await rateLimit(`join-signup:${ip}`, 10, 60 * 60_000))) return { error: "Quá nhiều lượt đăng ký từ máy này. Thử lại sau." };
  const cls = await findClassByCode(parsed.data.code);
  if (!cls) return { error: "Mã lớp không đúng hoặc lớp đã tắt tham gia bằng mã." };
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.username}) = ${parsed.data.username}`)
    .limit(1);
  if (taken) return { fieldErrors: { username: "Tên đăng nhập đã có người dùng. Nếu là bạn, hãy đăng nhập." } };
  const userId = await signupStudent(parsed.data);
  await joinClass(userId, cls.id);
  await createSession(userId);
  redirect(`/student/classes/${cls.id}`);
}

const pushSubSchema = z.strictObject({
  endpoint: z.url().startsWith("https://").max(1000),
  p256dh: z.string().regex(/^[A-Za-z0-9_-]+=*$/).max(200),
  auth: z.string().regex(/^[A-Za-z0-9_-]+=*$/).max(100),
});

/** Lưu thiết bị nhận Web Push của người đang đăng nhập (endpoint do trình duyệt cấp). */
export async function savePushSubscriptionAction(input: unknown): Promise<ActionState> {
  const actor = await requireActor();
  const parsed = pushSubSchema.safeParse(input);
  if (!parsed.success) return { error: "Đăng ký thông báo không hợp lệ." };
  await savePushSubscription(actor, parsed.data, (await headers()).get("user-agent"));
  return { ok: true, message: "Đã bật thông báo trên thiết bị này." };
}

export async function deletePushSubscriptionAction(endpoint: string): Promise<ActionState> {
  const actor = await requireActor();
  await deletePushSubscription(actor, String(endpoint).slice(0, 1000));
  return { ok: true, message: "Đã tắt thông báo trên thiết bị này." };
}

export async function sendTestPushAction(): Promise<ActionState> {
  const actor = await requireActor();
  if (!(await rateLimit(`push-test:${actor.id}`, 5, 60 * 60_000))) return { error: "Thử lại sau ít phút." };
  const n = await sendTestPush(actor);
  return n ? { ok: true, message: "Đã gửi thông báo thử." } : { error: "Không gửi được. Hãy bật lại thông báo trên thiết bị này." };
}
