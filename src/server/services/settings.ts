import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { appSettings, auditLogs } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { requireRole } from "@/server/policy";

/**
 * Keepalive: định kỳ chạy một truy vấn nhỏ vào DB để Supabase gói free không tạm dừng project
 * vì "không hoạt động". App không tự thức dậy được: cần một lịch gọi từ bên ngoài
 * (Vercel Cron gọi /api/cron mỗi ngày; Cloudflare Workers Cron / cron-job.org gọi /api/keepalive mỗi giờ).
 * Lịch ngoài gọi dày, còn admin chọn chu kỳ thật sự (intervalHours); lần gọi chưa tới hạn thì bỏ qua.
 */
export const KEEPALIVE_MIN_HOURS = 1;
export const KEEPALIVE_MAX_HOURS = 144; // 6 ngày: luôn dưới mốc tạm dừng 7 ngày của Supabase free

export type KeepaliveSettings = {
  enabled: boolean;
  intervalHours: number;
  lastPingAt: string | null;
  lastOk: boolean | null;
  lastError: string | null;
};

const DEFAULTS: KeepaliveSettings = { enabled: true, intervalHours: 24, lastPingAt: null, lastOk: null, lastError: null };

export async function getKeepalive(): Promise<KeepaliveSettings> {
  const [row] = await db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, "keepalive"));
  return { ...DEFAULTS, ...(row?.value as Partial<KeepaliveSettings> | undefined) };
}

async function saveKeepalive(value: KeepaliveSettings, updatedBy: string | null) {
  await db
    .insert(appSettings)
    .values({ key: "keepalive", value, updatedBy })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedBy, updatedAt: new Date() } });
}

/** Admin bật/tắt và chỉnh chu kỳ (giờ). */
export async function updateKeepalive(actor: Actor, input: { enabled: boolean; intervalHours: number }) {
  requireRole(actor, "ADMIN");
  const intervalHours = Math.min(KEEPALIVE_MAX_HOURS, Math.max(KEEPALIVE_MIN_HOURS, Math.round(input.intervalHours)));
  const cur = await getKeepalive();
  await saveKeepalive({ ...cur, enabled: input.enabled, intervalHours }, actor.id);
  await db.insert(auditLogs).values({
    actorId: actor.id,
    action: "settings.keepalive",
    targetType: "settings",
    targetId: "keepalive",
    meta: { enabled: input.enabled, intervalHours },
  });
}

/** Thời điểm ping kế tiếp (null nếu đang tắt). */
export function nextKeepaliveAt(s: KeepaliveSettings) {
  if (!s.enabled) return null;
  if (!s.lastPingAt) return new Date(0);
  return new Date(new Date(s.lastPingAt).getTime() + s.intervalHours * 3600_000);
}

/**
 * Chạy ping nếu đã tới hạn (hoặc force = admin bấm "Ping ngay"). Ghi lại kết quả vào app_settings
 * (bản thân việc ghi này cũng là hoạt động trên DB).
 */
export async function runKeepalive(opts: { now?: Date; force?: boolean; actor?: Actor } = {}) {
  const now = opts.now ?? new Date();
  if (opts.force) {
    if (!opts.actor) throw new Error("force cần actor");
    requireRole(opts.actor, "ADMIN");
  }
  const s = await getKeepalive();
  const due = nextKeepaliveAt(s);
  if (!opts.force && (!due || due > now)) return { ran: false as const, next: due };
  try {
    await db.execute(sql`select count(*) from users`);
    await saveKeepalive({ ...s, lastPingAt: now.toISOString(), lastOk: true, lastError: null }, opts.actor?.id ?? null);
    return { ran: true as const, ok: true };
  } catch (e) {
    const msg = (e as Error).message.slice(0, 200);
    await saveKeepalive({ ...s, lastPingAt: now.toISOString(), lastOk: false, lastError: msg }, opts.actor?.id ?? null).catch(() => {});
    return { ran: true as const, ok: false };
  }
}
