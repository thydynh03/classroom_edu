/** Web Push: gộp theo người nhận, giờ yên tĩnh, dọn thiết bị hết hạn. web-push được giả lập (không gọi mạng). */
import { beforeAll, describe, expect, inject, it, vi } from "vitest";
import { uuidv7 } from "uuidv7";
import { eq, sql } from "drizzle-orm";

process.env.DATABASE_URL = inject("dbUrl");
process.env.VAPID_PUBLIC_KEY = "BElnBj0Xw_test_public_key";
process.env.VAPID_PRIVATE_KEY = "test_private_key";

const sent: { endpoint: string; payload: { body: string; url: string } }[] = [];
let failWith: number | null = null;
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: () => {},
    sendNotification: async (sub: { endpoint: string }, payload: string) => {
      if (failWith) throw Object.assign(new Error("push failed"), { statusCode: failWith });
      sent.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) });
    },
  },
}));

type Actor = { id: string; role: "ADMIN" | "TEACHER" | "STUDENT"; fullName: string; username: string; mustChangePassword: boolean; sessionId: string };
const actor = (id: string, role: Actor["role"]): Actor => ({ id, role, fullName: role, username: id.slice(0, 8), mustChangePassword: false, sessionId: uuidv7() });
let m: { db: typeof import("@/server/db/client"); s: typeof import("@/server/db/schema"); push: typeof import("@/server/services/push"); notif: typeof import("@/server/services/notifications") };
let hs: Actor, hs2: Actor, hsNoDevice: Actor;
const vnTime = (h: number) => new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date())}T${String(h).padStart(2, "0")}:00:00+07:00`);

beforeAll(async () => {
  m = {
    db: await import("@/server/db/client"),
    s: await import("@/server/db/schema"),
    push: await import("@/server/services/push"),
    notif: await import("@/server/services/notifications"),
  };
  const mk = async (username: string) => {
    const [u] = await m.db.db.insert(m.s.users).values({ username, fullName: username, passwordHash: "x", role: "STUDENT" }).returning();
    return actor(u.id, "STUDENT");
  };
  hs = await mk("pu.hs");
  hs2 = await mk("pu.hs2");
  hsNoDevice = await mk("pu.hs3");
  await m.push.savePushSubscription(hs, { endpoint: "https://fcm.googleapis.com/fcm/send/1", p256dh: "key", auth: "auth" }, "UA");
  await m.push.savePushSubscription(hs2, { endpoint: "https://updates.push.services.mozilla.com/wpush/v2/2", p256dh: "key", auth: "auth" }, "UA");
});

const note = (recipientId: string, type: "ASSIGNMENT_CREATED" | "SUBMISSION_RECEIVED", title: string) => ({
  recipientId,
  type,
  title,
  href: "/student",
  dedupeKey: `pu:${uuidv7()}`,
});

describe("web push", () => {
  it("giờ yên tĩnh không gửi; ban ngày gửi gộp mỗi người 1 lần; người không có thiết bị được đánh dấu xong", async () => {
    await m.db.db.update(m.s.notifications).set({ pushSentAt: new Date() }).where(sql`${m.s.notifications.pushSentAt} is null`);
    await m.notif.notify(m.db.db, [
      note(hs.id, "ASSIGNMENT_CREATED", "Bài mới 1"),
      note(hs.id, "ASSIGNMENT_CREATED", "Bài mới 2"),
      note(hs2.id, "ASSIGNMENT_CREATED", "Bài mới 3"),
      note(hs2.id, "SUBMISSION_RECEIVED", "Không push"),
      note(hsNoDevice.id, "ASSIGNMENT_CREATED", "Không thiết bị"),
    ]);
    expect(await m.push.flushPush(vnTime(23))).toBe(0);
    expect(sent).toHaveLength(0);
    expect(await m.push.flushPush(vnTime(10))).toBe(2);
    expect(sent).toHaveLength(2);
    const toHs = sent.find((x) => x.endpoint.endsWith("/1"))!;
    expect(toHs.payload.body).toMatch(/2 thông báo mới/);
    const toHs2 = sent.find((x) => x.endpoint.endsWith("/2"))!;
    expect(toHs2.payload.body).toBe("Bài mới 3");
    expect(toHs2.payload.url).toMatch(/^\/n\//);
    const left = await m.db.db.select().from(m.s.notifications).where(sql`${m.s.notifications.pushSentAt} is null`);
    expect(left).toHaveLength(0);
    expect(await m.push.flushPush(vnTime(10))).toBe(0); // không gửi lại
  });

  it("trình duyệt báo 410 thì xóa đăng ký thiết bị", async () => {
    failWith = 410;
    await m.notif.notify(m.db.db, [note(hs2.id, "ASSIGNMENT_CREATED", "Bài mới 4")]);
    await m.push.flushPush(vnTime(10));
    failWith = null;
    const subs = await m.db.db.select().from(m.s.pushSubscriptions).where(eq(m.s.pushSubscriptions.userId, hs2.id));
    expect(subs).toHaveLength(0);
  });

  it("thiết bị đổi người đăng nhập: đăng ký chuyển sang người mới, không gửi nhầm người cũ", async () => {
    await m.push.savePushSubscription(hs2, { endpoint: "https://fcm.googleapis.com/fcm/send/1", p256dh: "k2", auth: "a2" }, "UA");
    const [sub] = await m.db.db.select().from(m.s.pushSubscriptions).where(eq(m.s.pushSubscriptions.endpoint, "https://fcm.googleapis.com/fcm/send/1"));
    expect(sub.userId).toBe(hs2.id);
    expect(await m.push.hasPushSubscription(hs.id)).toBe(false);
    await m.push.deletePushSubscription(hs, "https://fcm.googleapis.com/fcm/send/1"); // người khác không xóa được
    expect(await m.push.hasPushSubscription(hs2.id)).toBe(true);
  });
});

describe("chống SSRF", () => {
  it("chỉ nhận endpoint của dịch vụ push thật", async () => {
    for (const bad of ["https://169.254.169.254/latest", "http://fcm.googleapis.com/x", "https://localhost:5432/x", "https://fcm.googleapis.com.evil.com/x", "https://evil.com/fcm.googleapis.com"]) {
      await expect(m.push.savePushSubscription(hs, { endpoint: bad, p256dh: "k", auth: "a" }, null)).rejects.toThrow(/không được hỗ trợ/);
    }
    expect(m.push.isAllowedPushEndpoint("https://web.push.apple.com/abc")).toBe(true);
    expect(m.push.isAllowedPushEndpoint("https://wns2-sg2p.notify.windows.com/w/?token=x")).toBe(true);
  });
});
