import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ChevronLeft, KeyRound, Monitor } from "lucide-react";
import { db } from "@/server/db/client";
import { sessions, users } from "@/server/db/schema";
import { requireActor, homeFor } from "@/server/auth/guard";
import { shortDateTime } from "@/lib/dates";
import { RevokeButton } from "./revoke-button";
import { logoutAction } from "@/app/(auth)/actions";

export const metadata = { title: "Tài khoản · Classroom Edu" };

function deviceName(ua: string | null) {
  if (!ua) return "Thiết bị không rõ";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Trình duyệt";
  return [br, os].filter(Boolean).join(" · ");
}

export default async function SettingsPage() {
  const actor = await requireActor();
  const [me] = await db.select({ email: users.email, username: users.username, fullName: users.fullName }).from(users).where(eq(users.id, actor.id));
  const list = await db.select().from(sessions).where(eq(sessions.userId, actor.id)).orderBy(desc(sessions.lastSeenAt));
  return (
    <main className="bg-background min-h-screen px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <Link href={homeFor(actor.role)} className="text-muted hover:text-foreground inline-flex items-center gap-1 text-sm font-semibold">
          <ChevronLeft className="size-4" aria-hidden="true" /> Về trang chính
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">Tài khoản & bảo mật</h1>

        <section className="bg-surface border-border rounded-card border p-5">
          <h2 className="mb-3 text-[15px] font-bold">Thông tin</h2>
          <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
            <dt className="text-muted">Họ tên</dt>
            <dd className="font-semibold">{me.fullName}</dd>
            <dt className="text-muted">Tên đăng nhập</dt>
            <dd className="font-mono">{me.username}</dd>
            <dt className="text-muted">Email</dt>
            <dd>{me.email ?? "Chưa có"}</dd>
          </dl>
          <Link href="/change-password" className="text-primary mt-4 inline-flex items-center gap-1.5 text-sm font-bold hover:underline">
            <KeyRound className="size-4" aria-hidden="true" /> Đổi mật khẩu
          </Link>
        </section>

        <section className="bg-surface border-border rounded-card border p-5">
          <h2 className="mb-1 text-[15px] font-bold">Thiết bị đang đăng nhập</h2>
          <p className="text-muted mb-3 text-sm">Đăng xuất những thiết bị bạn không nhận ra.</p>
          <ul className="divide-border divide-y">
            {list.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <Monitor className="text-muted size-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {deviceName(s.userAgent)}
                    {s.id === actor.sessionId && <span className="bg-success-soft text-success ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold">Thiết bị này</span>}
                  </p>
                  <p className="text-muted text-xs">Hoạt động {shortDateTime(s.lastSeenAt)}</p>
                </div>
                {s.id !== actor.sessionId && <RevokeButton id={s.id} />}
              </li>
            ))}
          </ul>
        </section>

        <form action={logoutAction}>
          <button type="submit" className="text-danger text-sm font-bold hover:underline">
            Đăng xuất khỏi thiết bị này
          </button>
        </form>
      </div>
    </main>
  );
}
