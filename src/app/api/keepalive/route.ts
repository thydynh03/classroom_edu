import { cronAuthorized } from "@/server/cron-auth";
import { runKeepalive } from "@/server/services/settings";

export const dynamic = "force-dynamic";

/**
 * Ping DB nhẹ theo chu kỳ admin đặt ở /admin/settings (chống Supabase free tạm dừng).
 * Cho cron ngoài gọi dày (vd mỗi giờ); chưa tới hạn thì không làm gì.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req.headers.get("authorization"))) return new Response("Not found", { status: 404 });
  return Response.json(await runKeepalive());
}
