import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Đo thời gian xử lý request (p50/p95/p99 ở /admin/ops). Tắt bằng OBSERVABILITY=off.
  const { startOtel } = await import("@/server/observability/otel");
  startOtel();
  if (process.env.DISABLE_SCHEDULER !== "1" && !process.env.VERCEL) {
    const { startScheduler } = await import("@/server/jobs/deadlines");
    startScheduler();
  }
}

/** Lỗi server (render, route handler, server action, proxy) → error_events cho /admin/ops. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { recordServerError } = await import("@/server/observability/errors");
  await recordServerError(err, { route: context.routePath, routeType: context.routeType, method: request.method });
};
