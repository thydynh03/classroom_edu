import { z } from "zod";
import { db } from "@/server/db/client";
import { clientEvents } from "@/server/db/schema";
import { rateLimit } from "@/server/rate-limit";
import { clientIp } from "@/server/client-ip";
import { deviceOf } from "@/server/observability/events";

export const dynamic = "force-dynamic";

/**
 * Nhận sự kiện từ trình duyệt (sendBeacon): request không tới được server, lỗi 5xx, request chậm, Web Vitals.
 * Không cần đăng nhập (lỗi ở trang đăng nhập cũng cần thấy), không nhận dữ liệu cá nhân: chỉ loại, đường dẫn
 * (đã thay id bằng [id]), số đo, loại mạng. Giới hạn 60 lô/phút mỗi IP.
 */
const KINDS = ["network_error", "server_error", "slow_request", "offline", "LCP", "INP", "CLS", "TTFB", "FCP"] as const;
const eventSchema = z.strictObject({
  kind: z.enum(KINDS),
  route: z.string().max(200),
  value: z.number().finite().min(0).max(600_000).optional(),
  network: z.enum(["slow-2g", "2g", "3g", "4g", "wifi", "ethernet", "cellular", "unknown"]).optional(),
});
const bodySchema = z.array(eventSchema).min(1).max(20);

const normalizeRoute = (r: string) =>
  r
    .split("?")[0]
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "[id]")
    .replace(/\/join\/[^/]+/, "/join/[code]")
    .slice(0, 200) || "/";

export async function POST(req: Request) {
  if (!(await rateLimit(`telemetry:${await clientIp()}`, 60, 60_000))) return new Response(null, { status: 204 });
  const text = await req.text();
  if (text.length > 20_000) return new Response(null, { status: 413 });
  let parsed;
  try {
    parsed = bodySchema.safeParse(JSON.parse(text));
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!parsed.success) return new Response(null, { status: 400 });
  const device = deviceOf(req.headers.get("user-agent"));
  await db.insert(clientEvents).values(
    parsed.data.map((e) => ({ kind: e.kind, route: normalizeRoute(e.route), value: e.value ?? null, device, network: e.network ?? null })),
  );
  return new Response(null, { status: 204 });
}
