/** H3/H4: số liệu /admin/ops, /admin/activity — chỉ ADMIN, tính đúng, có thời hạn lưu. */
import { beforeAll, describe, expect, inject, it } from "vitest";
import { uuidv7 } from "uuidv7";
import { and, eq, sql } from "drizzle-orm";

process.env.DATABASE_URL = inject("dbUrl");

type Actor = { id: string; role: "ADMIN" | "TEACHER" | "STUDENT"; fullName: string; username: string; mustChangePassword: boolean; sessionId: string };
const actor = (id: string, role: Actor["role"]): Actor => ({ id, role, fullName: role, username: id.slice(0, 8), mustChangePassword: false, sessionId: uuidv7() });
const is404 = (p: Promise<unknown>) =>
  expect(p).rejects.toSatisfy((e: unknown) => String((e as { digest?: string }).digest ?? "").includes("404"));

let m: {
  db: typeof import("@/server/db/client");
  s: typeof import("@/server/db/schema");
  ops: typeof import("@/server/services/ops");
  errs: typeof import("@/server/observability/errors");
  maint: typeof import("@/server/jobs/maintenance");
};
let admin: Actor, gv: Actor, hs: Actor;

beforeAll(async () => {
  m = {
    db: await import("@/server/db/client"),
    s: await import("@/server/db/schema"),
    ops: await import("@/server/services/ops"),
    errs: await import("@/server/observability/errors"),
    maint: await import("@/server/jobs/maintenance"),
  };
  const [t] = await m.db.db.insert(m.s.users).values({ username: "op.gv", fullName: "GV", passwordHash: "x", role: "TEACHER" }).returning();
  const [h] = await m.db.db.insert(m.s.users).values({ username: "op.hs", fullName: "HS", passwordHash: "x", role: "STUDENT" }).returning();
  gv = actor(t.id, "TEACHER");
  hs = actor(h.id, "STUDENT");
  admin = await m.db.db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.allow_admin_insert', 'on', true)`);
    const [a] = await tx.insert(m.s.users).values({ username: "op.admin", fullName: "Admin", passwordHash: "x", role: "ADMIN" }).returning();
    return actor(a.id, "ADMIN");
  });
  await m.db.db.delete(m.s.requestSamples);
  // 100 mẫu: 1..100 ms, 2 lỗi 500
  await m.db.db.insert(m.s.requestSamples).values(
    Array.from({ length: 100 }, (_, i) => ({ method: "GET", route: i < 50 ? "/student" : "/teacher", status: i < 2 ? 500 : 200, durationMs: i + 1 })),
  );
  await m.db.db.insert(m.s.clientEvents).values([
    { kind: "network_error", route: "/student/assignments/[id]", network: "3g", device: "mobile" },
    { kind: "LCP", route: "/student", value: 1800, device: "mobile" },
  ]);
  await m.db.db.insert(m.s.userEvents).values([
    { userId: hs.id, role: "STUDENT", event: "login", device: "mobile" },
    { userId: hs.id, role: "STUDENT", event: "submission.submit", device: "mobile" },
    { userId: gv.id, role: "TEACHER", event: "login", device: "desktop" },
  ]);
  await m.errs.recordServerError(Object.assign(new Error("Failed query: select … params: x@y.vn"), { digest: "d1" }), { route: "/teacher", routeType: "render", method: "GET" });
});

describe("/admin/ops", () => {
  it("chỉ ADMIN", async () => {
    await is404(m.ops.opsOverview(gv, 24));
    await is404(m.ops.opsOverview(hs, 24));
    await is404(m.ops.activityOverview(gv));
    await is404(m.ops.userTimeline(hs, "op.gv"));
  });

  it("p50/p95/p99, tỉ lệ lỗi, lỗi server đã làm sạch, sự kiện trình duyệt", async () => {
    const o = await m.ops.opsOverview(admin, 24);
    expect(o.totals.total).toBe(100);
    expect(o.totals.errors5xx).toBe(2);
    expect(Math.round(o.totals.p50!)).toBe(51);
    expect(Math.round(o.totals.p95!)).toBe(95);
    expect(o.routes.length).toBe(2);
    expect(o.errors[0].message).toBe("Lỗi truy vấn database");
    expect(o.errors[0].message).not.toContain("x@y.vn");
    expect(o.client.find((c) => c.kind === "network_error")?.network).toBe("3g");
    expect(o.vitals.find((v) => v.kind === "LCP")?.p75).toBe(1800);
  });
});

describe("/admin/activity", () => {
  it("DAU/MAU theo vai trò, thiết bị, mức dùng tính năng", async () => {
    const a = await m.ops.activityOverview(admin);
    expect(a.active.dau).toBeGreaterThanOrEqual(2);
    expect(a.active.mauStudent).toBeGreaterThanOrEqual(1);
    expect(a.devices.some((d) => d.device === "mobile" && d.role === "STUDENT")).toBe(true);
    expect(a.features.find((f) => f.event === "login")?.users).toBeGreaterThanOrEqual(2);
  });

  it("xem dòng thời gian một tài khoản được ghi audit", async () => {
    const t = await m.ops.userTimeline(admin, "op.hs");
    expect(t?.events.map((e) => e.event)).toEqual(expect.arrayContaining(["login", "submission.submit"]));
    const logs = await m.db.db
      .select()
      .from(m.s.auditLogs)
      .where(and(eq(m.s.auditLogs.action, "admin.view_timeline"), eq(m.s.auditLogs.targetId, hs.id)));
    expect(logs).toHaveLength(1);
    expect(await m.ops.userTimeline(admin, "khong-ton-tai")).toBeNull();
  });
});

describe("thời hạn lưu", () => {
  it("dọn số liệu cũ", async () => {
    await m.db.db.insert(m.s.requestSamples).values({ method: "GET", route: "/old", status: 200, durationMs: 1, at: new Date(Date.now() - 8 * 86400_000) });
    await m.db.db.insert(m.s.userEvents).values({ userId: hs.id, role: "STUDENT", event: "login", at: new Date(Date.now() - 91 * 86400_000) });
    await m.maint.cleanupExpired();
    const old = await m.db.db.select().from(m.s.requestSamples).where(eq(m.s.requestSamples.route, "/old"));
    expect(old).toHaveLength(0);
    const oldEv = await m.db.db.select().from(m.s.userEvents).where(sql`${m.s.userEvents.at} < now() - interval '90 days'`);
    expect(oldEv).toHaveLength(0);
  });
});
