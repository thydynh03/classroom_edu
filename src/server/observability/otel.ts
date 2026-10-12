import "server-only";
import { NodeTracerProvider, type ReadableSpan, type SpanProcessor } from "@opentelemetry/sdk-trace-node";

/**
 * Lấy mẫu thời gian xử lý request phía server từ span gốc của Next.js ("BaseServer.handleRequest")
 * và ghi theo lô vào request_samples (dashboard p50/p95/p99 ở /admin/ops).
 * Serverless có thể đóng băng instance trước khi kịp ghi lô cuối: số liệu là MẪU, có thể thiếu một ít.
 */
type Sample = { method: string; route: string; status: number; durationMs: number; at: Date };

const SKIP = /^\/(_next|favicon|icons|sw\.js|manifest|api\/telemetry)/;
const sampleRate = Math.min(1, Math.max(0, Number(process.env.OBS_SAMPLE_RATE ?? 1)));

class RequestMetricsProcessor implements SpanProcessor {
  private buf: Sample[] = [];
  private timer: NodeJS.Timeout | null = null;

  onStart() {}

  onEnd(span: ReadableSpan) {
    const a = span.attributes;
    // Mỗi request có 2 span handleRequest: lần chạy proxy.ts (không có next.route, luôn 200) và lần render thật
    // (có next.route = pattern, vd /student/assignments/[id], và mã trạng thái đúng). Chỉ giữ lần render.
    if (a["next.span_type"] !== "BaseServer.handleRequest" || !a["next.route"]) return;
    const route = String(a["next.route"]).split("?")[0].slice(0, 200);
    if (SKIP.test(route) || Math.random() > sampleRate) return;
    const durationMs = Math.round(span.duration[0] * 1000 + span.duration[1] / 1e6);
    this.buf.push({ method: String(a["http.method"] ?? "GET").slice(0, 10), route, status: Number(a["http.status_code"] ?? 200), durationMs, at: new Date() });
    if (this.buf.length >= 25) void this.flush();
    else this.timer ??= setTimeout(() => void this.flush(), 5000);
  }

  async flush() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const batch = this.buf.splice(0, this.buf.length);
    if (!batch.length) return;
    try {
      const { db } = await import("@/server/db/client");
      const { requestSamples } = await import("@/server/db/schema");
      await db.insert(requestSamples).values(batch);
    } catch (e) {
      // Drizzle bọc lỗi gốc trong `cause` (vd ECONNREFUSED, CONNECTION_CLOSED); chỉ log mã lỗi, không log tham số.
      const cause = (e as { cause?: { code?: string; message?: string } }).cause;
      console.error("[obs] ghi request_samples lỗi", { samples: batch.length, code: cause?.code ?? null, cause: cause?.message ?? (e as Error).message.split("\n")[0] });
    }
  }

  forceFlush() {
    return this.flush();
  }

  shutdown() {
    return this.flush();
  }
}

let started = false;
export function startOtel() {
  if (started || process.env.OBSERVABILITY === "off") return;
  started = true;
  new NodeTracerProvider({ spanProcessors: [new RequestMetricsProcessor()] }).register();
}
