import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";

/**
 * Rate limit cửa sổ cố định, lưu ở Postgres nên đúng cả khi chạy nhiều instance (Vercel serverless).
 * Một câu UPSERT nguyên tử: hết cửa sổ thì đếm lại từ 1. Trả về true nếu còn trong giới hạn.
 * Dòng hết hạn được dọn trong job định kỳ (cleanupExpired ở jobs/maintenance.ts).
 */
export async function rateLimit(key: string, limit: number, windowMs: number) {
  const resetAt = new Date(Date.now() + windowMs);
  const rows = await db.execute<{ count: number }>(sql`
    insert into rate_limits (key, count, reset_at) values (${key}, 1, ${resetAt.toISOString()}::timestamptz)
    on conflict (key) do update set
      count = case when rate_limits.reset_at <= now() then 1 else rate_limits.count + 1 end,
      reset_at = case when rate_limits.reset_at <= now() then excluded.reset_at else rate_limits.reset_at end
    returning count`);
  return Number(rows[0]?.count ?? 1) <= limit;
}
