import { NextResponse, type NextRequest } from "next/server";

/**
 * CSP theo nonce: mỗi request một nonce ngẫu nhiên. Next.js tự gắn nonce vào script của framework
 * khi đọc được header CSP trên request; script tự thêm (next-themes) lấy nonce qua header x-nonce.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV !== "production";
  const storage = storageOrigin();
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${storage}`.trim(),
    "font-src 'self' data:",
    `connect-src 'self' ${storage}${isDev ? " ws: wss:" : ""}`.trim(),
    `media-src 'self' ${storage}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

function storageOrigin() {
  try {
    return process.env.S3_PUBLIC_ORIGIN ?? new URL(process.env.S3_ENDPOINT ?? "").origin;
  } catch {
    return "";
  }
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|files/|n/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
