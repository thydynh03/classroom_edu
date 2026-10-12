import "server-only";
import { notFound, redirect } from "next/navigation";
import { getActor, type Actor } from "./session";

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

export function homeFor(role: Actor["role"]) {
  if (role === "ADMIN") return "/admin";
  return role === "STUDENT" ? "/student" : "/teacher";
}
