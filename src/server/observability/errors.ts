import "server-only";

/**
 * Ghi lỗi server cho /admin/ops. Message được làm sạch: lỗi truy vấn DB (có thể chứa tham số = dữ liệu người dùng)
 * chỉ giữ mã lỗi; cắt 300 ký tự; bỏ email/số dài.
 */
export function sanitizeErrorMessage(err: unknown) {
  const e = err as { message?: string; code?: string; cause?: { code?: string; message?: string } };
  const msg = String(e?.message ?? err ?? "Lỗi không rõ");
  if (/^Failed query/i.test(msg)) return `Lỗi truy vấn database${e.cause?.code ? ` (${e.cause.code})` : ""}`;
  return msg
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]")
    .replace(/\b\d{6,}\b/g, "[số]")
    .replace(/(token|password|secret|cookie)=\S+/gi, "$1=[ẩn]")
    .slice(0, 300);
}

export async function recordServerError(err: unknown, info: { route: string; routeType: string; method?: string }) {
  try {
    const { db } = await import("@/server/db/client");
    const { errorEvents } = await import("@/server/db/schema");
    await db.insert(errorEvents).values({
      route: info.route.slice(0, 200),
      routeType: info.routeType.slice(0, 20),
      method: info.method?.slice(0, 10) ?? null,
      digest: ((err as { digest?: string })?.digest ?? "").slice(0, 100) || null,
      message: sanitizeErrorMessage(err),
    });
  } catch (e) {
    console.error("[obs] ghi error_events lỗi", (e as Error).message);
  }
}

/** Ghi một lần chạy job (cron/scheduler) kèm kết quả tóm tắt (không có dữ liệu người dùng). */
export async function recordJob<T extends Record<string, unknown>>(job: string, fn: () => Promise<T>): Promise<T> {
  const { db } = await import("@/server/db/client");
  const { jobRuns } = await import("@/server/db/schema");
  const startedAt = new Date();
  try {
    const result = await fn();
    await db.insert(jobRuns).values({ job, startedAt, finishedAt: new Date(), ok: true, result: JSON.parse(JSON.stringify(result)) }).catch(() => {});
    return result;
  } catch (e) {
    await db
      .insert(jobRuns)
      .values({ job, startedAt, finishedAt: new Date(), ok: false, result: { error: sanitizeErrorMessage(e) } })
      .catch(() => {});
    throw e;
  }
}
