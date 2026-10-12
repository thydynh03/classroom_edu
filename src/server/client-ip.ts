import "server-only";
import { headers } from "next/headers";

/**
 * IP của người dùng, đọc theo nền tảng. Header do proxy tin cậy đặt mới dùng được để rate limit:
 * - Vercel: `x-real-ip` (Vercel tự đặt, client không giả được).
 * - Sau proxy khác (Cloudflare, nginx…): đặt CLIENT_IP_HEADER, vd "cf-connecting-ip".
 * - Còn lại (dev / chạy trực tiếp): phần tử đầu `x-forwarded-for`.
 */
export async function clientIp() {
  const h = await headers();
  const custom = process.env.CLIENT_IP_HEADER?.trim().toLowerCase();
  const raw =
    (custom && h.get(custom)) ||
    (process.env.VERCEL && h.get("x-real-ip")) ||
    h.get("x-forwarded-for")?.split(",")[0];
  return raw?.trim().slice(0, 64) || "local";
}
