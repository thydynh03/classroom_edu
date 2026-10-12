import "server-only";
import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { after } from "next/server";
import webpush from "web-push";
import { db } from "@/server/db/client";
import { notifications, pushSubscriptions } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { isQuietHours, type NotificationType } from "./notifications";
import { UserError } from "./errors";

/**
 * Web Push: nhắc được cả HS không có email (cần cài PWA trên iPhone, iOS 16.4+).
 * Bật khi có VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY (tạo: npx web-push generate-vapid-keys).
 * Payload chỉ có tiêu đề + đường dẫn (không có điểm, nhận xét).
 */
const PUSH_TYPES: NotificationType[] = [
  "ASSIGNMENT_CREATED",
  "ASSIGNMENT_DUE_SOON",
  "ASSIGNMENT_OVERDUE",
  "ASSIGNMENT_RETURNED",
  "ASSIGNMENT_REMINDER",
  "MATERIAL_CREATED",
  "CLASS_INVITE",
];

/**
 * Chỉ nhận endpoint của dịch vụ push thật (server sẽ gửi POST tới endpoint này).
 * Không giới hạn thì kẻ xấu đăng ký endpoint trỏ vào dịch vụ nội bộ → server tự gọi tới đó (SSRF).
 */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^(web\.push|[a-z0-9-]+\.push)\.apple\.com$/, /\.notify\.windows\.com$/];
export function isAllowedPushEndpoint(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && !u.port && PUSH_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

export function pushPublicKey() {
  return process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY ? process.env.VAPID_PUBLIC_KEY : null;
}

let configured = false;
function ensureVapid() {
  if (!pushPublicKey()) return false;
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? `mailto:no-reply@${new URL(process.env.APP_URL ?? "http://localhost").hostname}`, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
    configured = true;
  }
  return true;
}

export async function savePushSubscription(actor: Actor, sub: { endpoint: string; p256dh: string; auth: string }, userAgent: string | null) {
  if (!isAllowedPushEndpoint(sub.endpoint)) throw new UserError("Dịch vụ thông báo của trình duyệt này không được hỗ trợ.");
  await db
    .insert(pushSubscriptions)
    .values({ userId: actor.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, userAgent: userAgent?.slice(0, 300) ?? null })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      // Thiết bị đổi người đăng nhập: chuyển đăng ký sang người dùng hiện tại.
      set: { userId: actor.id, p256dh: sub.p256dh, auth: sub.auth, failedCount: 0 },
    });
}

export async function deletePushSubscription(actor: Actor, endpoint: string) {
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, actor.id), eq(pushSubscriptions.endpoint, endpoint)));
}

export async function hasPushSubscription(userId: string) {
  const [r] = await db.select({ id: pushSubscriptions.id }).from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)).limit(1);
  return !!r;
}

type Payload = { title: string; body: string; url: string; tag: string };

async function sendTo(userId: string, payload: Payload) {
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  let ok = 0;
  for (const s of subs) {
    if (!isAllowedPushEndpoint(s.endpoint)) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
      continue;
    }
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 86400, urgency: "normal" });
      ok++;
      await db.update(pushSubscriptions).set({ failedCount: 0, lastSuccessAt: new Date() }).where(eq(pushSubscriptions.id, s.id));
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      // 404/410: trình duyệt đã hủy đăng ký → xóa. Lỗi khác: đếm, quá 5 lần thì xóa.
      if (status === 404 || status === 410 || s.failedCount >= 4) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
      else await db.update(pushSubscriptions).set({ failedCount: s.failedCount + 1 }).where(eq(pushSubscriptions.id, s.id));
    }
  }
  return ok;
}

/** Gửi thử tới thiết bị của chính mình (nút trong Tài khoản & bảo mật). */
export async function sendTestPush(actor: Actor) {
  if (!ensureVapid()) return 0;
  return sendTo(actor.id, { title: "Classroom Edu", body: "Thông báo trên thiết bị này đã hoạt động.", url: "/settings", tag: "test" });
}

/**
 * Gửi push cho thông báo chưa gửi (gộp theo người nhận). Không gửi trong giờ yên tĩnh 21:30–6:30.
 * Người không có thiết bị đăng ký hoặc thông báo không thuộc loại push → đánh dấu xong ngay.
 */
export async function flushPush(now = new Date(), maxRecipients = 200) {
  const since = new Date(now.getTime() - 3 * 86400_000);
  // Loại không push hoặc quá cũ: đánh dấu xong để khỏi quét lại.
  await db.execute(sql`
    update notifications set push_sent_at = ${now.toISOString()}::timestamptz
    where push_sent_at is null and (type not in (${sql.join(PUSH_TYPES.map((t) => sql`${t}`), sql`, `)}) or created_at < ${since.toISOString()}::timestamptz
      or not exists (select 1 from push_subscriptions p where p.user_id = notifications.recipient_id))`);
  if (!ensureVapid() || isQuietHours(now)) return 0;
  const rows = await db
    .select({ id: notifications.id, recipientId: notifications.recipientId, title: notifications.title, href: notifications.href })
    .from(notifications)
    .where(and(isNull(notifications.pushSentAt), inArray(notifications.type, PUSH_TYPES), gt(notifications.createdAt, since)))
    .orderBy(notifications.createdAt)
    .limit(maxRecipients * 5);
  const byUser = new Map<string, typeof rows>();
  for (const r of rows) byUser.set(r.recipientId, [...(byUser.get(r.recipientId) ?? []), r]);
  let sent = 0;
  for (const [userId, items] of [...byUser].slice(0, maxRecipients)) {
    const payload: Payload =
      items.length === 1
        ? { title: "Classroom Edu", body: items[0].title, url: `/n/${items[0].id}`, tag: items[0].id }
        : { title: "Classroom Edu", body: `Bạn có ${items.length} thông báo mới: ${items[0].title}`, url: "/", tag: "digest" };
    if ((await sendTo(userId, payload)) > 0) sent++;
    await db.update(notifications).set({ pushSentAt: new Date() }).where(inArray(notifications.id, items.map((i) => i.id)));
  }
  return sent;
}

/** Gửi push ngay sau khi trả response (đăng bài, trả bài, nhắc nộp…) thay vì chờ job 15 phút. */
export function kickPush() {
  if (!pushPublicKey()) return;
  try {
    after(() => flushPush().catch((e) => console.error("[push] gửi lỗi", (e as Error).message)));
  } catch {
    // Ngoài ngữ cảnh request (test, script): bỏ qua, job định kỳ sẽ gửi.
  }
}
