import "server-only";
import { notFound, redirect } from "next/navigation";
import { getActor, type Actor } from "./session";

/** Dùng trong layout/page/server action. Chưa đăng nhập → /login; sai role → 404. */
export async function requireActor(role?: Actor["role"]): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.mustChangePassword) redirect("/change-password");
  if (role && actor.role !== role) notFound();
  return actor;
}

export function homeFor(role: Actor["role"]) {
  if (role === "ADMIN") return "/admin";
  return role === "STUDENT" ? "/student" : "/teacher";
}
