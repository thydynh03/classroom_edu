import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db/client";
import { notifications } from "@/server/db/schema";
import { getActor } from "@/server/auth/session";
import { isUuid } from "@/server/policy";

/** Mở thông báo: đánh dấu đã đọc (chỉ của chính mình) rồi chuyển tới trang đích. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  const { id } = await params;
  if (!actor || !isUuid(id)) return NextResponse.redirect(new URL("/login", req.url));
  const [n] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.recipientId, actor.id)))
    .returning({ href: notifications.href });
  const target = n?.href?.startsWith("/") ? n.href : "/";
  return NextResponse.redirect(new URL(target, req.url));
}
