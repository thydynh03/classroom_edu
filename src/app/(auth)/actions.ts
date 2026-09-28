"use server";

import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { authTokens, users } from "@/server/db/schema";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import {
  createSession,
  destroySession,
  getActor,
  revokeAllSessions,
  revokeOtherSessions,
} from "@/server/auth/session";
import { homeFor } from "@/server/auth/guard";
import { newToken, sha256 } from "@/server/auth/tokens";
import { rateLimit } from "@/server/rate-limit";
import { appUrl, sendMail } from "@/server/mail";
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/server/validation/auth";
import { type ActionState, fieldErrorsFrom, formToObject } from "@/lib/action";
import { isSafeRedirect } from "@/lib/safe-redirect";

const GENERIC_LOGIN_ERROR = "Tên đăng nhập hoặc mật khẩu không đúng.";
const MAX_FAILED = 10;
const LOCK_MINUTES = 15;
let dummyHash: Promise<string> | null = null;

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const { identifier, password } = parsed.data;

  const ip = await clientIp();
  if (!rateLimit(`login:ip:${ip}`, 30, 15 * 60_000)) {
    return { error: "Bạn thử quá nhiều lần. Đợi 15 phút rồi thử lại." };
  }

  const id = identifier.toLowerCase();
  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        or(sql`lower(${users.username}) = ${id}`, sql`lower(${users.email}) = ${id}`),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);

  if (!user) {
    dummyHash ??= hashPassword("khong-ton-tai");
    await verifyPassword(await dummyHash, password); // cân bằng thời gian phản hồi
    return { error: GENERIC_LOGIN_ERROR };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { error: `Tài khoản tạm khóa do nhập sai nhiều lần. Thử lại sau ${LOCK_MINUTES} phút.` };
  }
  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    const failed = user.failedLogins + 1;
    await db
      .update(users)
      .set({
        failedLogins: failed >= MAX_FAILED ? 0 : failed,
        lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      })
      .where(eq(users.id, user.id));
    return { error: GENERIC_LOGIN_ERROR };
  }
  if (user.status !== "ACTIVE") return { error: GENERIC_LOGIN_ERROR };
  if (user.role === "TEACHER" && !user.emailVerifiedAt) {
    return { error: "Bạn cần xác minh email trước. Kiểm tra hộp thư của bạn." };
  }

  await db.update(users).set({ failedLogins: 0, lockedUntil: null }).where(eq(users.id, user.id));
  await createSession(user.id);
  const next = String(fd.get("next") ?? "");
  if (user.mustChangePassword) redirect("/change-password");
  redirect(isSafeRedirect(next) ? next : homeFor(user.role));
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  if (!rateLimit(`register:${await clientIp()}`, 5, 60 * 60_000)) {
    return { error: "Bạn đăng ký quá nhiều lần. Thử lại sau." };
  }
  const { email, username, fullName, password } = parsed.data;
  const taken = await db
    .select({ username: users.username, email: users.email })
    .from(users)
    .where(or(sql`lower(${users.username}) = ${username}`, sql`lower(${users.email}) = ${email}`));
  if (taken.some((t) => t.username.toLowerCase() === username)) {
    return { fieldErrors: { username: "Tên đăng nhập đã có người dùng" } };
  }
  if (taken.some((t) => t.email?.toLowerCase() === email)) {
    return { fieldErrors: { email: "Email này đã được đăng ký" } };
  }
  // Role luôn là TEACHER: không bao giờ lấy role từ form.
  const [user] = await db
    .insert(users)
    .values({ email, username, fullName, passwordHash: await hashPassword(password), role: "TEACHER" })
    .returning({ id: users.id });
  await issueEmailToken(user.id, email, "VERIFY_EMAIL");
  return {
    ok: true,
    message: `Đã gửi email xác minh tới ${email}. Mở email và bấm vào liên kết để kích hoạt tài khoản.`,
  };
}

async function issueEmailToken(
  userId: string,
  email: string,
  purpose: "VERIFY_EMAIL" | "RESET_PASSWORD",
) {
  const token = newToken();
  await db.insert(authTokens).values({
    userId,
    purpose,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + (purpose === "VERIFY_EMAIL" ? 24 * 60 : 30) * 60_000),
  });
  if (purpose === "VERIFY_EMAIL") {
    await sendMail(
      email,
      "Xác minh email Classroom Edu",
      `Chào bạn,\n\nBấm vào liên kết sau để kích hoạt tài khoản giáo viên (hết hạn sau 24 giờ):\n${appUrl(`/verify-email?token=${token}`)}\n\nNếu bạn không đăng ký, hãy bỏ qua email này.`,
    );
  } else {
    await sendMail(
      email,
      "Đặt lại mật khẩu Classroom Edu",
      `Chào bạn,\n\nBấm vào liên kết sau để đặt mật khẩu mới (hết hạn sau 30 phút):\n${appUrl(`/reset-password?token=${token}`)}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.`,
    );
  }
}

async function consumeToken(token: string, purpose: "VERIFY_EMAIL" | "RESET_PASSWORD") {
  const [row] = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(authTokens.tokenHash, sha256(token)),
        eq(authTokens.purpose, purpose),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .returning({ userId: authTokens.userId });
  return row?.userId ?? null;
}

export async function verifyEmailToken(token: string) {
  const userId = await consumeToken(token, "VERIFY_EMAIL");
  if (!userId) return false;
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
  return true;
}

export async function forgotPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const done: ActionState = {
    ok: true,
    message:
      "Nếu email này có trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu. Học sinh không có email hãy nhờ giáo viên cấp lại mật khẩu.",
  };
  if (!email.includes("@")) return { fieldErrors: { email: "Email không hợp lệ" } };
  if (!rateLimit(`forgot:${await clientIp()}`, 5, 15 * 60_000)) return done;
  const [user] = await db
    .select({ id: users.id, email: users.email, status: users.status })
    .from(users)
    .where(and(sql`lower(${users.email}) = ${email}`, isNull(users.deletedAt)))
    .limit(1);
  if (user?.email && user.status === "ACTIVE") await issueEmailToken(user.id, user.email, "RESET_PASSWORD");
  return done;
}

export async function resetPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const userId = await consumeToken(parsed.data.token, "RESET_PASSWORD");
  if (!userId) return { error: "Liên kết đã hết hạn hoặc đã được dùng. Hãy yêu cầu liên kết mới." };
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword), mustChangePassword: false, failedLogins: 0, lockedUntil: null })
    .where(eq(users.id, userId));
  await revokeAllSessions(userId);
  return { ok: true, message: "Đã đặt mật khẩu mới. Bạn có thể đăng nhập." };
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  const parsed = changePasswordSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const [user] = await db.select().from(users).where(eq(users.id, actor.id)).limit(1);
  if (!(await verifyPassword(user.passwordHash, parsed.data.currentPassword))) {
    return { fieldErrors: { currentPassword: "Mật khẩu hiện tại không đúng" } };
  }
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword), mustChangePassword: false })
    .where(eq(users.id, actor.id));
  await revokeOtherSessions(actor.id, actor.sessionId);
  redirect(homeFor(actor.role));
}

