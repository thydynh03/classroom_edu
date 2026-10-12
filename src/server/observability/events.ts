import "server-only";
import { headers } from "next/headers";
import { db } from "@/server/db/client";
import { userEvents } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";

/**
 * Theo dõi hành vi (H4): ghi ở SERVER tại điểm nghiệp vụ. Chỉ tên sự kiện + vài thuộc tính kỹ thuật
 * (loại bài, số file…), KHÔNG có nội dung bài, điểm, nhận xét, mật khẩu. Lưu 90 ngày (cleanupExpired).
 */
export type TrackedEvent =
  | "login"
  | "assignment.open"
  | "submission.submit"
  | "quiz.submit"
  | "grade.save"
  | "grade.return"
  | "class.create"
  | "assignment.create"
  | "assignment.publish"
  | "material.create"
  | "upload.complete"
  | "upgrade.view"
  | "upgrade.request"
  | "push.enable"
  | "quiz.import"
  | "gradebook.export";

export function deviceOf(ua: string | null) {
  if (!ua) return "unknown";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

/** Không bao giờ làm hỏng thao tác chính: lỗi ghi sự kiện chỉ ghi log. */
export async function track(actor: Pick<Actor, "id" | "role">, event: TrackedEvent, meta?: Record<string, string | number | boolean>) {
  if (process.env.TRACKING === "off") return;
  try {
    let ua: string | null = null;
    try {
      ua = (await headers()).get("user-agent");
    } catch {}
    await db.insert(userEvents).values({ userId: actor.id, role: actor.role, event, device: deviceOf(ua), meta: meta ?? null });
  } catch (e) {
    console.error("[track] lỗi", (e as Error).message);
  }
}
