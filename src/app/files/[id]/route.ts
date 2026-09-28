import { NextResponse, type NextRequest } from "next/server";
import { getActor } from "@/server/auth/session";
import { downloadUrl } from "@/server/services/files";

/** Tải file: kiểm tra quyền rồi chuyển hướng tới presigned URL 5 phút. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return new NextResponse("Not found", { status: 404 });
  const { id } = await params;
  try {
    const url = await downloadUrl(actor, id, req.nextUrl.searchParams.get("inline") === "1");
    return NextResponse.redirect(url, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
