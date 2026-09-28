"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActor } from "@/server/auth/guard";
import * as admin from "@/server/services/admin";
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
  const r = await wrap(() => admin.setUserStatus(actor, userId, parsed.data));
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
  return wrap(() => admin.adminResetPassword(actor, userId));
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
  const r = await wrap(() => admin.createTeacher(actor, parsed.data));
  if (!r.ok) return { error: r.error };
  revalidatePath("/admin");
  return { ok: true, tempPassword: r.value, username: parsed.data.username };
}
