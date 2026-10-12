import "server-only";
import { timingSafeEqual } from "node:crypto";

/** Header `Authorization: Bearer <CRON_SECRET>` (Vercel Cron tự gửi; cron ngoài phải gửi kèm). */
export function cronAuthorized(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
