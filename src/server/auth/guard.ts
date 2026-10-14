import "server-only";
import { notFound, redirect } from "next/navigation";
import { getActor, type Actor } from "./session";
import { UserError } from "@/server/services/errors";

/**
 * Dùng trong layout/page/server action. Chưa đăng nhập → /login; sai role → 404;
 * GV chưa được duyệt → /pending-approval ở MỌI nơi (kể cả khi không truyền role), trừ vài trang tài khoản
 * gọi với `allowPending: true` (trang chờ duyệt, Tài khoản & bảo mật, thu hồi phiên).
 */
export async function requireActor(role?: Actor["role"], opts: { allowPending?: boolean } = {}): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.mustChangePassword) redirect("/change-password");
  if (role && actor.role !== role) notFound();
  if (actor.role === "TEACHER" && actor.approved === false && !opts.allowPending) redirect("/pending-approval");
  return actor;
}

export const REAUTH_MINUTES = 15;
export const REAUTH_MESSAGE = "Thao tác nhạy cảm: hãy xác nhận lại mật khẩu ở thanh phía trên rồi thử lại.";

export function recentlyAuthenticated(actor: Pick<Actor, "authAt">, now = Date.now()) {
  return !!actor.authAt && now - actor.authAt.getTime() < REAUTH_MINUTES * 60_000;
}

/** Step-up: thao tác nhạy cảm của admin chỉ chạy khi vừa đăng nhập / nhập lại mật khẩu trong 15 phút. */
export function requireRecentAuth(actor: Pick<Actor, "authAt">) {
  if (!recentlyAuthenticated(actor)) throw new UserError(REAUTH_MESSAGE);
}

export function homeFor(role: Actor["role"]) {
  if (role === "ADMIN") return "/admin";
  if (role === "MODERATOR") return "/mod";
  return role === "STUDENT" ? "/student" : "/teacher";
}
