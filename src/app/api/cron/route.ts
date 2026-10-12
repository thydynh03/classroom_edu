import { timingSafeEqual } from "node:crypto";
import { runScheduledPublishing, scanDeadlines } from "@/server/jobs/deadlines";
import { cleanupExpired } from "@/server/jobs/maintenance";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Vercel Cron và cron ngoài (Cloudflare Workers Cron Triggers, mỗi 10–15 phút — xem docs/HANDOVER.md) gọi:
 * đăng bài theo lịch + nhắc hạn + gửi email chờ + dọn dữ liệu hết hạn.
 */
export async function GET(req: Request) {
  if (!authorized(req.headers.get("authorization"))) return new Response("Not found", { status: 404 });
  const published = await runScheduledPublishing();
  const deadlines = await scanDeadlines();
  const cleanup = await cleanupExpired();
  return Response.json({ published, deadlines, cleanup });
}
