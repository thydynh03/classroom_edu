import "server-only";
import { and, asc, count, desc, eq, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { db, type Tx } from "@/server/db/client";
import { notifications, users } from "@/server/db/schema";
import { appUrl, emailBudget, sendMail, vnDayStart } from "@/server/mail";

export type NotificationType =
  | "ASSIGNMENT_CREATED"
  | "ASSIGNMENT_DUE_SOON"
  | "ASSIGNMENT_OVERDUE"
  | "SUBMISSION_RECEIVED"
  | "ASSIGNMENT_RETURNED"
  | "ASSIGNMENT_REMINDER"
  | "MATERIAL_CREATED"
  | "CLASS_INVITE"
  | "PASSWORD_RESET";

/** Loại thông báo có gửi email (còn lại chỉ in-app). */
const EMAIL_TYPES: NotificationType[] = [
  "ASSIGNMENT_CREATED",
  "ASSIGNMENT_DUE_SOON",
  "ASSIGNMENT_RETURNED",
  "ASSIGNMENT_REMINDER",
  "MATERIAL_CREATED",
];

/**
 * Tạo thông báo in-app. dedupeKey chống gửi trùng (ON CONFLICT DO NOTHING).
 * Payload chỉ chứa tiêu đề + link, không chứa điểm/nhận xét.
 */
export async function notify(
  exec: Tx | typeof db,
  items: { recipientId: string; type: NotificationType; title: string; href: string; dedupeKey: string }[],
) {
  if (!items.length) return;
  await exec.insert(notifications).values(items).onConflictDoNothing();
}

/** Báo cho chủ tài khoản biết mật khẩu vừa bị người khác (GV/admin) cấp lại. */
export async function notifyPasswordReset(userId: string, byName: string, now = new Date()) {
  const at = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(now);
  await notify(db, [
    {
      recipientId: userId,
      type: "PASSWORD_RESET",
      title: `Mật khẩu của bạn đã được ${byName} cấp lại lúc ${at}. Nếu bạn không yêu cầu, hãy báo giáo viên chủ nhiệm hoặc quản trị viên.`,
      href: "/settings",
      dedupeKey: `pwreset:${userId}:${now.getTime()}`,
    },
  ]);
}

export function isQuietHours(now = new Date()) {
  const h = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Ho_Chi_Minh" }).format(now),
  );
  const m = Number(
    new Intl.DateTimeFormat("en-GB", { minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(now),
  );
  const mins = h * 60 + m;
  return mins >= 21 * 60 + 30 || mins < 6 * 60 + 30;
}

const MAX_EMAIL_ATTEMPTS = 5;

/**
 * Gửi email nhắc việc (chạy định kỳ từ /api/cron hoặc scheduler):
 * - Bỏ qua giờ yên tĩnh 21:30–6:30 (giờ VN).
 * - Thông báo chỉ in-app, hoặc người nhận không có email → đánh dấu xong ngay (không chiếm hàng đợi).
 * - GỘP: mỗi người tối đa 1 email/ngày, liệt kê mọi thông báo đang chờ (users.last_reminder_email_at).
 * - Chỉ dùng phần hạn mức dành cho email nhắc (emailBudget("reminder")); hết suất thì để mai gửi tiếp.
 * - Gửi lỗi: thử lại có giãn cách (email_next_at), quá MAX_EMAIL_ATTEMPTS lần thì bỏ, không chặn người khác.
 */
export async function flushNotificationEmails(now = new Date(), maxRecipients = 50) {
  if (isQuietHours(now)) return 0;
  await db.execute(sql`
    update notifications n set email_sent_at = ${now.toISOString()}::timestamptz
    from users u
    where u.id = n.recipient_id and n.email_sent_at is null
      and (n.type not in (${sql.join(EMAIL_TYPES.map((t) => sql`${t}`), sql`, `)}) or u.email is null or u.status <> 'ACTIVE')`);

  const budget = Math.min(maxRecipients, await emailBudget("reminder", now));
  if (budget <= 0) return 0;
  const dayStart = vnDayStart(now);
  const recipients = await db
    .select({ id: users.id, email: users.email, fullName: users.fullName })
    .from(notifications)
    .innerJoin(users, eq(users.id, notifications.recipientId))
    .where(
      and(
        isNull(notifications.emailSentAt),
        or(isNull(notifications.emailNextAt), lte(notifications.emailNextAt, now)),
        or(isNull(users.lastReminderEmailAt), lt(users.lastReminderEmailAt, dayStart)),
      ),
    )
    .groupBy(users.id)
    .orderBy(sql`min(${notifications.createdAt})`)
    .limit(budget);

  let sent = 0;
  for (const r of recipients) {
    if (!r.email) continue;
    const items = await db
      .select({ id: notifications.id, title: notifications.title, href: notifications.href, attempts: notifications.emailAttempts })
      .from(notifications)
      .where(and(eq(notifications.recipientId, r.id), isNull(notifications.emailSentAt)))
      .orderBy(asc(notifications.createdAt))
      .limit(20);
    if (!items.length) continue;
    const ids = items.map((i) => i.id);
    const subject = items.length === 1 ? items[0].title : `Classroom Edu: ${items.length} việc mới cho bạn`;
    const text = [
      `Chào ${r.fullName},`,
      "",
      ...items.map((i) => `• ${i.title}\n  ${appUrl(i.href)}`),
      "",
      "Email này gửi tối đa một lần mỗi ngày. Xem tất cả thông báo trong ứng dụng.",
    ].join("\n");
    const ok = await sendMail(r.email, subject, text, "reminder");
    if (ok) {
      sent++;
      await db.update(notifications).set({ emailSentAt: new Date(), emailLastError: null }).where(inArray(notifications.id, ids));
      await db.update(users).set({ lastReminderEmailAt: new Date() }).where(eq(users.id, r.id));
      continue;
    }
    if ((await emailBudget("reminder", now)) <= 0) break; // hết suất hôm nay: để mai gửi tiếp, không tính là lỗi
    const attempts = Math.max(...items.map((i) => i.attempts)) + 1;
    const giveUp = attempts >= MAX_EMAIL_ATTEMPTS;
    await db
      .update(notifications)
      .set({
        emailAttempts: attempts,
        emailLastError: "smtp_failed",
        emailNextAt: new Date(now.getTime() + attempts * attempts * 15 * 60_000),
        emailSentAt: giveUp ? now : null,
      })
      .where(inArray(notifications.id, ids));
  }
  return sent;
}

export async function listNotifications(userId: string, limit = 50) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function unreadCount(userId: string) {
  const [r] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.recipientId, userId), isNull(notifications.readAt)));
  return r?.n ?? 0;
}

export async function markAllRead(userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.recipientId, userId), isNull(notifications.readAt)));
}
