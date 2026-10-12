import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { emailSends } from "@/server/db/schema";

/**
 * Gửi email qua SMTP (production: Resend, xem DECISIONS 2026-10-12).
 * Nhà cung cấp gói free giới hạn theo ngày (Resend: 100/ngày), nên đếm số email đã gửi theo ngày giờ VN:
 * - EMAIL_DAILY_LIMIT (mặc định 100, 0 = không giới hạn): tổng mọi loại.
 * - EMAIL_REMINDER_SHARE (mặc định 0.7): phần dành cho email nhắc việc; phần còn lại luôn để dành cho
 *   email giao dịch (xác minh, đặt lại mật khẩu) và email báo admin.
 */
export type MailKind = "transactional" | "admin" | "reminder";

let transporter: Transporter | null = null;
function getTransporter() {
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: Number(process.env.SMTP_PORT) === 465,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
      : undefined,
  });
  return transporter;
}

/** Ngày theo giờ Việt Nam, dạng YYYY-MM-DD. */
export function vnDayKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now);
}

/** 0h ngày hôm nay theo giờ Việt Nam. */
export function vnDayStart(now = new Date()) {
  return new Date(`${vnDayKey(now)}T00:00:00+07:00`);
}

export function emailLimits() {
  const total = Math.max(0, Number(process.env.EMAIL_DAILY_LIMIT ?? 100) || 0);
  const share = Math.min(1, Math.max(0, Number(process.env.EMAIL_REMINDER_SHARE ?? 0.7)));
  return { total, reminders: total ? Math.floor(total * share) : 0 };
}

/** Số email còn được gửi hôm nay cho loại `kind` (Infinity nếu không giới hạn). */
export async function emailBudget(kind: MailKind, now = new Date()) {
  const { total, reminders } = emailLimits();
  if (!total) return Number.POSITIVE_INFINITY;
  const rows = await db.select({ kind: emailSends.kind, count: emailSends.count }).from(emailSends).where(eq(emailSends.day, vnDayKey(now)));
  const sent = rows.reduce((s, r) => s + r.count, 0);
  const left = total - sent;
  if (kind !== "reminder") return Math.max(0, left);
  const remSent = rows.find((r) => r.kind === "reminder")?.count ?? 0;
  return Math.max(0, Math.min(left, reminders - remSent));
}

async function countSent(kind: MailKind, now = new Date()) {
  await db
    .insert(emailSends)
    .values({ day: vnDayKey(now), kind, count: 1 })
    .onConflictDoUpdate({ target: [emailSends.day, emailSends.kind], set: { count: sql`${emailSends.count} + 1` } });
}

/**
 * Gửi một email. Trả về false nếu lỗi hoặc đã hết hạn mức hôm nay (không ném lỗi; không log nội dung).
 */
export async function sendMail(to: string, subject: string, text: string, kind: MailKind = "transactional") {
  if ((await emailBudget(kind)) <= 0) {
    console.warn("[mail] hết hạn mức email hôm nay", { kind });
    return false;
  }
  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM ?? "Classroom Edu <no-reply@localhost>",
      to,
      subject,
      text,
    });
    await countSent(kind);
    return true;
  } catch (e) {
    console.error("[mail] gửi thất bại", { kind, error: (e as Error).message });
    return false;
  }
}

/** Số email đã gửi hôm nay theo loại (cho dashboard admin). */
export async function emailsSentToday(now = new Date()) {
  return db.select({ kind: emailSends.kind, count: emailSends.count }).from(emailSends).where(and(eq(emailSends.day, vnDayKey(now))));
}

export function appUrl(path: string) {
  return new URL(path, process.env.APP_URL ?? "http://localhost:3000").toString();
}
