"use client";

import * as React from "react";
import { useReportWebVitals } from "next/web-vitals";

/**
 * Đo phía trình duyệt cho /admin/ops: request (kể cả server action) không tới được server, lỗi 5xx,
 * request chậm (> 8 giây), mất mạng, Web Vitals. Gửi theo lô bằng sendBeacon. Không gửi nội dung, cookie hay id người dùng.
 */
type Ev = { kind: string; route: string; value?: number; network?: string };
const queue: Ev[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function network() {
  const c = (navigator as { connection?: { effectiveType?: string; type?: string } }).connection;
  const t = c?.type === "wifi" || c?.type === "ethernet" || c?.type === "cellular" ? c.type : c?.effectiveType;
  return t && ["slow-2g", "2g", "3g", "4g", "wifi", "ethernet", "cellular"].includes(t) ? t : "unknown";
}

function flush() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!queue.length) return;
  const batch = JSON.stringify(queue.splice(0, 20));
  try {
    if (!navigator.sendBeacon?.("/api/telemetry", new Blob([batch], { type: "application/json" }))) {
      void fetch("/api/telemetry", { method: "POST", body: batch, keepalive: true, headers: { "content-type": "application/json" } });
    }
  } catch {}
}

function push(e: Omit<Ev, "route" | "network">) {
  queue.push({ ...e, route: location.pathname, network: network() });
  if (queue.length >= 20) flush();
  else timer ??= setTimeout(flush, 10_000);
}

let patched = false;
function patchFetch() {
  if (patched || typeof window === "undefined") return;
  patched = true;
  const orig = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const same = url.startsWith("/") || url.startsWith(location.origin);
    if (!same || url.includes("/api/telemetry")) return orig(input, init);
    const t0 = performance.now();
    try {
      const res = await orig(input, init);
      const ms = performance.now() - t0;
      if (res.status >= 500) push({ kind: "server_error", value: res.status });
      else if (ms > 8000) push({ kind: "slow_request", value: Math.round(ms) });
      return res;
    } catch (e) {
      // AbortError do người dùng/Next hủy không phải "mất request"
      if ((e as Error)?.name !== "AbortError") push({ kind: navigator.onLine ? "network_error" : "offline" });
      throw e;
    }
  };
}

export function TelemetryBeacon() {
  useReportWebVitals((m) => {
    if (["LCP", "INP", "CLS", "TTFB", "FCP"].includes(m.name)) push({ kind: m.name, value: Math.round(m.value * (m.name === "CLS" ? 1000 : 1)) });
  });
  React.useEffect(() => {
    patchFetch();
    const onOffline = () => push({ kind: "offline" });
    const onHide = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
    };
  }, []);
  return null;
}
