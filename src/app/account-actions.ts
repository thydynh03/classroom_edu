"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db/client";
import { sessions, users } from "@/server/db/schema";
import { getActor, createSession } from "@/server/auth/session";
import { requireActor } from "@/server/auth/guard";
import { hashPassword } from "@/server/auth/password";
import { markAllRead } from "@/server/services/notifications";
import { findClassByCode, joinClass } from "@/server/services/classes";
import { rateLimit } from "@/server/rate-limit";
import { passwordSchema, usernameSchema } from "@/server/validation/auth";
import { type ActionState, fieldErrorsFrom, formToObject } from "@/lib/action";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";

export async function markAllReadAction() {
  const actor = await requireActor();
  await markAllRead(actor.id);
  revalidatePath("/", "layout");
}

export async function revokeSessionAction(sessionId: string) {
  const actor = await requireActor();
  if (sessionId === actor.sessionId) return;
  await db.delete(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.userId, actor.id)));
  revalidatePath("/settings");
}

/** Học sinh đã đăng nhập tham gia lớp bằng mã. */
export async function joinWithCodeAction(code: string): Promise<ActionState> {
  const actor = await getActor();
  if (!actor) redirect(`/join/${encodeURIComponent(code)}`);
  if (actor.role !== "STUDENT") return { error: "Chỉ tài khoản học sinh mới tham gia lớp bằng mã." };
  if (!rateLimit(`join:${actor.id}`, 20, 15 * 60_000)) return { error: "Bạn thử quá nhiều lần. Đợi một lát." };
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
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`join-signup:${ip}`, 10, 60 * 60_000)) return { error: "Quá nhiều lượt đăng ký từ máy này. Thử lại sau." };
  const cls = await findClassByCode(parsed.data.code);
  if (!cls) return { error: "Mã lớp không đúng hoặc lớp đã tắt tham gia bằng mã." };
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.username}) = ${parsed.data.username}`)
    .limit(1);
  if (taken) return { fieldErrors: { username: "Tên đăng nhập đã có người dùng. Nếu là bạn, hãy đăng nhập." } };
  const [u] = await db
    .insert(users)
    .values({
      fullName: parsed.data.fullName,
      username: parsed.data.username,
      passwordHash: await hashPassword(parsed.data.password),
      role: "STUDENT",
    })
    .returning({ id: users.id });
  await joinClass(u.id, cls.id);
  await createSession(u.id);
  redirect(`/student/classes/${cls.id}`);
}
