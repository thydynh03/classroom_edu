import "server-only";
import { cookies, headers } from "next/headers";
import { and, eq, gt, ne } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/server/db/client";
import { sessions, users } from "@/server/db/schema";
import { newToken, sha256 } from "./tokens";

const SESSION_DAYS = 14;
const COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-ce_session" : "ce_session";

export type Actor = {
  id: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  fullName: string;
  username: string;
  mustChangePassword: boolean;
  sessionId: string;
};

export async function createSession(userId: string) {
  const token = newToken();
  const h = await headers();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.insert(sessions).values({
    userId,
    tokenHash: sha256(token),
    userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    expiresAt,
  });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  jar.delete(COOKIE);
}

export async function revokeOtherSessions(userId: string, keepSessionId: string) {
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, keepSessionId)));
}

export async function revokeAllSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Người dùng hiện tại, hoặc null. Tài khoản không ACTIVE coi như chưa đăng nhập. */
export const getActor = cache(async (): Promise<Actor | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({
      sessionId: sessions.id,
      lastSeenAt: sessions.lastSeenAt,
      id: users.id,
      role: users.role,
      fullName: users.fullName,
      username: users.username,
      status: users.status,
      mustChangePassword: users.mustChangePassword,
      deletedAt: users.deletedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const r = rows[0];
  if (!r || r.status !== "ACTIVE" || r.deletedAt) return null;
  if (Date.now() - r.lastSeenAt.getTime() > 3600_000) {
    await db
      .update(sessions)
      .set({
        lastSeenAt: new Date(),
        expiresAt: new Date(Date.now() + SESSION_DAYS * 86400_000),
      })
      .where(eq(sessions.id, r.sessionId));
  }
  return {
    id: r.id,
    role: r.role,
    fullName: r.fullName,
    username: r.username,
    mustChangePassword: r.mustChangePassword,
    sessionId: r.sessionId,
  };
});
