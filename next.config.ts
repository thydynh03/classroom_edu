import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
// CSP (có nonce) được đặt trong src/proxy.ts.

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Nhập đề Word/Excel gửi file qua server action (tối đa 4 MB; Vercel giới hạn body 4,5 MB).
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
        ],
      },
    ];
  },
};

export default nextConfig;
