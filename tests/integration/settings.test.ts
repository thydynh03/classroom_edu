/** Cài đặt admin: ping DB định kỳ (keepalive) chống Supabase free tạm dừng. */
import { beforeAll, describe, expect, inject, it } from "vitest";
import { uuidv7 } from "uuidv7";
import { sql } from "drizzle-orm";

process.env.DATABASE_URL = inject("dbUrl");

type Actor = { id: string; role: "ADMIN" | "TEACHER" | "STUDENT"; fullName: string; username: string; mustChangePassword: boolean; sessionId: string };
const actor = (id: string, role: Actor["role"]): Actor => ({ id, role, fullName: role, username: id.slice(0, 8), mustChangePassword: false, sessionId: uuidv7() });
const is404 = (p: Promise<unknown>) =>
  expect(p).rejects.toSatisfy((e: unknown) => String((e as { digest?: string }).digest ?? "").includes("404"));

let settings: typeof import("@/server/services/settings");
let admin: Actor, gv: Actor;

beforeAll(async () => {
  settings = await import("@/server/services/settings");
  const { db } = await import("@/server/db/client");
  const s = await import("@/server/db/schema");
  const [t] = await db.insert(s.users).values({ username: "st.gv", fullName: "GV", passwordHash: "x", role: "TEACHER" }).returning();
  gv = actor(t.id, "TEACHER");
  admin = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.allow_admin_insert', 'on', true)`);
    const [a] = await tx.insert(s.users).values({ username: "st.admin", fullName: "Admin", passwordHash: "x", role: "ADMIN" }).returning();
    return actor(a.id, "ADMIN");
  });
});

describe("keepalive", () => {
  it("mặc định bật, 24 giờ; chỉ ping khi tới hạn", async () => {
    const s = await settings.getKeepalive();
    expect(s.enabled).toBe(true);
    expect(s.intervalHours).toBe(24);
    const t0 = new Date();
    expect((await settings.runKeepalive({ now: t0 })).ran).toBe(true);
    expect((await settings.runKeepalive({ now: new Date(t0.getTime() + 3600_000) })).ran).toBe(false);
    expect((await settings.runKeepalive({ now: new Date(t0.getTime() + 25 * 3600_000) })).ran).toBe(true);
    expect((await settings.getKeepalive()).lastOk).toBe(true);
  });

  it("admin chỉnh chu kỳ (giới hạn 1–144 giờ) và tắt được; tắt thì không ping", async () => {
    await settings.updateKeepalive(admin, { enabled: true, intervalHours: 999 });
    expect((await settings.getKeepalive()).intervalHours).toBe(144);
    await settings.updateKeepalive(admin, { enabled: false, intervalHours: 6 });
    const later = new Date(Date.now() + 30 * 86400_000);
    expect((await settings.runKeepalive({ now: later })).ran).toBe(false);
    await settings.updateKeepalive(admin, { enabled: true, intervalHours: 24 });
  });

  it("chỉ ADMIN chỉnh cài đặt và bấm Ping ngay", async () => {
    await is404(settings.updateKeepalive(gv, { enabled: false, intervalHours: 1 }));
    await is404(settings.runKeepalive({ force: true, actor: gv }));
    expect((await settings.runKeepalive({ force: true, actor: admin })).ran).toBe(true);
  });
});
