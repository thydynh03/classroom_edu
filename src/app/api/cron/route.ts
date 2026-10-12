import { runScheduledPublishing, scanDeadlines } from "@/server/jobs/deadlines";
import { cleanupExpired } from "@/server/jobs/maintenance";
import { cronAuthorized } from "@/server/cron-auth";
import { runKeepalive } from "@/server/services/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron và cron ngoài (Cloudflare Workers Cron Triggers, mỗi 10–15 phút — xem docs/HANDOVER.md) gọi:
 * đăng bài theo lịch + nhắc hạn + gửi email chờ + dọn dữ liệu hết hạn.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req.headers.get("authorization"))) return new Response("Not found", { status: 404 });
  const published = await runScheduledPublishing();
  const deadlines = await scanDeadlines();
  const cleanup = await cleanupExpired();
  const keepalive = await runKeepalive();
  return Response.json({ published, deadlines, cleanup, keepalive });
}
