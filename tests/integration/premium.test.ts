/** H5: yêu cầu mở khóa tính năng nâng cao → admin mở khóa → chặn ở server. */
import { beforeAll, describe, expect, inject, it } from "vitest";
import { uuidv7 } from "uuidv7";
import { and, eq, sql } from "drizzle-orm";

process.env.DATABASE_URL = inject("dbUrl");

type Actor = { id: string; role: "ADMIN" | "TEACHER" | "STUDENT"; fullName: string; username: string; mustChangePassword: boolean; sessionId: string };
const actor = (id: string, role: Actor["role"], fullName: string = role): Actor => ({ id, role, fullName, username: id.slice(0, 8), mustChangePassword: false, sessionId: uuidv7() });
const is404 = (p: Promise<unknown>) =>
  expect(p).rejects.toSatisfy((e: unknown) => String((e as { digest?: string }).digest ?? "").includes("404"));

let m: {
  db: typeof import("@/server/db/client");
  s: typeof import("@/server/db/schema");
  up: typeof import("@/server/services/upgrades");
  ent: typeof import("@/server/entitlements");
};
let admin: Actor, gv: Actor, gv2: Actor, hs: Actor;

beforeAll(async () => {
  m = {
    db: await import("@/server/db/client"),
    s: await import("@/server/db/schema"),
    up: await import("@/server/services/upgrades"),
    ent: await import("@/server/entitlements"),
  };
  const { db } = m.db;
  const mk = async (username: string, role: "TEACHER" | "STUDENT") => {
    const [u] = await db.insert(m.s.users).values({ username, fullName: username, passwordHash: "x", role }).returning();
    return actor(u.id, role, username);
  };
  gv = await mk("pr.gv", "TEACHER");
  gv2 = await mk("pr.gv2", "TEACHER");
  hs = await mk("pr.hs", "STUDENT");
  admin = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.allow_admin_insert', 'on', true)`);
    const [a] = await tx.insert(m.s.users).values({ username: "pr.admin", fullName: "Admin", passwordHash: "x", role: "ADMIN" }).returning();
    return actor(a.id, "ADMIN");
  });
});

describe("yêu cầu mở khóa", () => {
  it("GV gửi yêu cầu, admin có thông báo; gửi trùng bị chặn; HS/admin không gửi được", async () => {
    const id = await m.up.requestUpgrade(gv, { featureKey: "GRADEBOOK", plan: "MONTH", contact: "0900000000" });
    expect(id).toBeTruthy();
    await expect(m.up.requestUpgrade(gv, { featureKey: "GRADEBOOK", plan: "YEAR" })).rejects.toThrow(/đã gửi yêu cầu/);
    await is404(m.up.requestUpgrade(hs, { featureKey: "GRADEBOOK", plan: "MONTH" }));
    await is404(m.up.requestUpgrade(admin, { featureKey: "GRADEBOOK", plan: "MONTH" }));
    const notes = await m.db.db.select().from(m.s.notifications).where(and(eq(m.s.notifications.recipientId, admin.id), eq(m.s.notifications.type, "UPGRADE_REQUEST")));
    expect(notes).toHaveLength(1);
    const state = await m.up.myUpgradeState(gv);
    expect(state.requests.map((r) => r.featureKey)).toContain("GRADEBOOK");
  });

  it("tính năng sắp ra mắt chỉ ghi nhận quan tâm, không mở khóa được", async () => {
    const id = await m.up.requestUpgrade(gv, { featureKey: "AI_FEEDBACK", plan: "YEAR" });
    const [r] = await m.db.db.select().from(m.s.upgradeRequests).where(eq(m.s.upgradeRequests.id, id));
    expect(r.plan).toBe("INTEREST");
    await expect(m.up.grantFeature(admin, { requestId: id, featureKey: "AI_FEEDBACK", months: 1 })).rejects.toThrow(/chưa mở bán/);
  });
});

describe("mở khóa và chặn ở server", () => {
  it("chưa mở khóa thì requireFeature từ chối; chỉ ADMIN mở khóa được", async () => {
    await expect(m.ent.requireFeature(gv, "GRADEBOOK")).rejects.toThrow(/tính năng nâng cao/);
    const [req] = await m.up.listUpgradeRequests(admin, { open: true }).then((l) => l.filter((r) => r.featureKey === "GRADEBOOK"));
    await is404(m.up.grantFeature(gv, { requestId: req.id, featureKey: "GRADEBOOK", months: 1 }));
    await is404(m.up.listUpgradeRequests(gv));
    // requestId của tính năng khác → 404
    await is404(m.up.grantFeature(admin, { requestId: req.id, featureKey: "QUIZ_IMPORT", months: 1 }));
    const { expiresAt } = await m.up.grantFeature(admin, { requestId: req.id, featureKey: "GRADEBOOK", months: 1 });
    expect(expiresAt!.getTime()).toBeGreaterThan(Date.now() + 27 * 86400_000);
    expect(await m.ent.hasFeature(gv, "GRADEBOOK")).toBe(true);
    expect(await m.ent.hasFeature(gv2, "GRADEBOOK")).toBe(false); // theo từng GV
    expect(await m.ent.hasFeature(gv, "QUIZ_IMPORT")).toBe(false);
    const [after] = await m.db.db.select().from(m.s.upgradeRequests).where(eq(m.s.upgradeRequests.id, req.id));
    expect(after.status).toBe("GRANTED");
  });

  it("gia hạn cộng tiếp từ ngày hết hạn; thu hồi thì mất quyền", async () => {
    const before = (await m.up.listActiveGrants(admin)).find((g) => g.username === "pr.gv" && g.featureKey === "GRADEBOOK")!;
    const { expiresAt } = await m.up.grantFeature(admin, { username: "pr.gv", featureKey: "GRADEBOOK", months: 3 });
    expect(expiresAt!.getTime()).toBeGreaterThan(before.expiresAt!.getTime() + 80 * 86400_000);
    const active = (await m.up.listActiveGrants(admin)).filter((g) => g.username === "pr.gv" && g.featureKey === "GRADEBOOK");
    expect(active).toHaveLength(1);
    await is404(m.up.revokeGrant(gv, active[0].id));
    await m.up.revokeGrant(admin, active[0].id);
    expect(await m.ent.hasFeature(gv, "GRADEBOOK")).toBe(false);
  });

  it("quyền hết hạn không còn hiệu lực; không mở khóa cho HS", async () => {
    await m.db.db.insert(m.s.featureGrants).values({ userId: gv2.id, featureKey: "QUIZ_ANALYTICS", expiresAt: new Date(Date.now() - 1000) });
    expect(await m.ent.hasFeature(gv2, "QUIZ_ANALYTICS")).toBe(false);
    await expect(m.up.grantFeature(admin, { username: "pr.hs", featureKey: "GRADEBOOK", months: 1 })).rejects.toThrow(/Không tìm thấy giáo viên/);
  });
});
