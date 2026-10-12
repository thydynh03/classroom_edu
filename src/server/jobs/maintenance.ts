import "server-only";
import { and, eq, isNotNull, lt, or } from "drizzle-orm";
import { db } from "@/server/db/client";
import { authTokens, clientEvents, emailSends, errorEvents, files, jobRuns, rateLimits, requestSamples, sessions, userEvents } from "@/server/db/schema";
import { deleteObject } from "@/server/storage/s3";
import { vnDayKey } from "@/server/mail";

const DAY = 86400_000;

/**
 * Dọn dữ liệu hết hạn để bảng và bucket không phình (chạy trong /api/cron và scheduler, mỗi lần tối đa vài trăm file).
 * Không đụng tới bài nộp, điểm hay file đã READY.
 */
export async function cleanupExpired(now = new Date()) {
  const sess = await db.delete(sessions).where(lt(sessions.expiresAt, now)).returning({ id: sessions.id });
  const tokens = await db
    .delete(authTokens)
    .where(or(lt(authTokens.expiresAt, new Date(now.getTime() - DAY)), and(isNotNull(authTokens.usedAt), lt(authTokens.usedAt, new Date(now.getTime() - DAY)))))
    .returning({ id: authTokens.id });
  await db.delete(rateLimits).where(lt(rateLimits.resetAt, now));
  await db.delete(emailSends).where(lt(emailSends.day, vnDayKey(new Date(now.getTime() - 90 * DAY))));
  // Thời hạn lưu số liệu vận hành / hành vi (xem trang Chính sách quyền riêng tư)
  await db.delete(requestSamples).where(lt(requestSamples.at, new Date(now.getTime() - 7 * DAY)));
  await db.delete(clientEvents).where(lt(clientEvents.at, new Date(now.getTime() - 30 * DAY)));
  await db.delete(errorEvents).where(lt(errorEvents.at, new Date(now.getTime() - 30 * DAY)));
  await db.delete(jobRuns).where(lt(jobRuns.startedAt, new Date(now.getTime() - 30 * DAY)));
  await db.delete(userEvents).where(lt(userEvents.at, new Date(now.getTime() - 90 * DAY)));

  // File xin URL upload nhưng không xác nhận (đóng tab, mất mạng) sau 24 giờ: xóa object, đánh dấu DELETED.
  const stale = await db
    .select({ id: files.id, key: files.storageKey })
    .from(files)
    .where(and(eq(files.status, "PENDING"), lt(files.createdAt, new Date(now.getTime() - DAY))))
    .limit(200);
  let removed = 0;
  for (const f of stale) {
    try {
      if (process.env.S3_ENDPOINT) await deleteObject(f.key);
      await db.update(files).set({ status: "DELETED" }).where(and(eq(files.id, f.id), eq(files.status, "PENDING")));
      removed++;
    } catch (e) {
      console.error("[jobs] xóa file dở dang lỗi", { fileId: f.id, error: (e as Error).message });
    }
  }
  return { sessions: sess.length, tokens: tokens.length, pendingFiles: removed };
}
