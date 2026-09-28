import "server-only";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { db, type Tx } from "@/server/db/client";
import { notifications, users } from "@/server/db/schema";
import { appUrl, sendMail } from "@/server/mail";

export type NotificationType =
  | "ASSIGNMENT_CREATED"
  | "ASSIGNMENT_DUE_SOON"
  | "ASSIGNMENT_OVERDUE"
  | "SUBMISSION_RECEIVED"
  | "ASSIGNMENT_RETURNED";

/** Loại thông báo có gửi email (còn lại chỉ in-app). */
const EMAIL_TYPES: NotificationType[] = [
  "ASSIGNMENT_CREATED",
  "ASSIGNMENT_DUE_SOON",
  "ASSIGNMENT_RETURNED",
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

/** Gửi email cho thông báo chưa gửi (chạy định kỳ, bỏ qua giờ yên tĩnh 21:30–6:30). */
export async function flushNotificationEmails(limit = 50) {
  if (isQuietHours()) return 0;
  const rows = await db
    .select({ id: notifications.id, title: notifications.title, href: notifications.href, type: notifications.type, email: users.email })
    .from(notifications)
    .innerJoin(users, eq(users.id, notifications.recipientId))
    .where(and(isNull(notifications.emailSentAt), inArray(notifications.type, EMAIL_TYPES)))
    .limit(limit);
  let sent = 0;
  for (const r of rows) {
    if (r.email) {
      const ok = await sendMail(r.email, r.title, `${r.title}\n\nXem chi tiết: ${appUrl(r.href)}`);
      if (!ok) continue;
      sent++;
    }
    await db.update(notifications).set({ emailSentAt: new Date() }).where(eq(notifications.id, r.id));
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
