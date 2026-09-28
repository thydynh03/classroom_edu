import Link from "next/link";
import { requireActor } from "@/server/auth/guard";
import { adminStats, listUsers } from "@/server/services/admin";
import { PageHeader } from "@/components/domain/page-parts";
import { shortDateTime } from "@/lib/dates";
import { requestNow } from "@/lib/now";
import { cn } from "@/lib/utils";
import { CreateTeacherForm, UserActions } from "./user-actions";

export const metadata = { title: "Quản trị · Classroom Edu" };

const ROLE_LABEL = { ADMIN: "Quản trị", TEACHER: "Giáo viên", STUDENT: "Học sinh" } as const;
const STATUS_LABEL = { ACTIVE: "Hoạt động", LOCKED: "Đã khóa", DISABLED: "Vô hiệu" } as const;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }>;
}) {
  const actor = await requireActor("ADMIN");
  const sp = await searchParams;
  const role = (["ADMIN", "TEACHER", "STUDENT"] as const).find((r) => r === sp.role);
  const status = (["ACTIVE", "LOCKED", "DISABLED"] as const).find((r) => r === sp.status);
  const page = Number(sp.page) || 1;
  const [stats, list] = await Promise.all([adminStats(actor), listUsers(actor, { q: sp.q, role, status, page })]);
  const now = requestNow();
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (sp.q) u.set("q", sp.q);
    if (role) u.set("role", role);
    if (status) u.set("status", status);
    u.set("page", String(p));
    return `?${u}`;
  };

  return (
    <>
      <PageHeader title="Người dùng" description="Quản lý tài khoản. Quản trị viên không xem được bài làm và điểm của học sinh." />
      <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Giáo viên", stats.teachers],
          ["Học sinh", stats.students],
          ["Lớp đang hoạt động", stats.activeClasses],
          ["Bài nộp 7 ngày", stats.submissions7d],
          ["Tài khoản bị khóa", stats.locked],
        ].map(([l, v]) => (
          <div key={l as string} className="bg-surface border-border rounded-card border p-4">
            <dd className="text-2xl font-extrabold tabular-nums">{v}</dd>
            <dt className="text-muted text-xs font-semibold">{l}</dt>
          </div>
        ))}
      </dl>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="bg-surface border-border rounded-card min-w-0 border">
          <form className="border-border flex flex-wrap items-end gap-2 border-b p-4" role="search">
            <div className="min-w-48 flex-1 space-y-1">
              <label htmlFor="q" className="text-muted text-xs font-semibold">Tìm theo tên, tên đăng nhập, email</label>
              <input id="q" name="q" defaultValue={sp.q ?? ""} className="border-border bg-surface rounded-control h-10 w-full border px-3 text-sm" />
            </div>
            <div className="space-y-1">
              <label htmlFor="role" className="text-muted text-xs font-semibold">Vai trò</label>
              <select id="role" name="role" defaultValue={role ?? ""} className="border-border bg-surface rounded-control h-10 border px-2 text-sm">
                <option value="">Tất cả</option>
                <option value="TEACHER">Giáo viên</option>
                <option value="STUDENT">Học sinh</option>
                <option value="ADMIN">Quản trị</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="status" className="text-muted text-xs font-semibold">Trạng thái</label>
              <select id="status" name="status" defaultValue={status ?? ""} className="border-border bg-surface rounded-control h-10 border px-2 text-sm">
                <option value="">Tất cả</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="LOCKED">Đã khóa</option>
                <option value="DISABLED">Vô hiệu</option>
              </select>
            </div>
            <button type="submit" className="bg-primary text-on-primary rounded-control h-10 px-4 text-sm font-bold">Lọc</button>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Danh sách người dùng</caption>
              <thead className="text-muted text-left text-xs">
                <tr className="border-border border-b">
                  <th scope="col" className="px-4 py-2 font-semibold">Người dùng</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Vai trò</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Trạng thái</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Tạo lúc</th>
                  <th scope="col" className="px-4 py-2 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {list.rows.map((u) => {
                  const loginLocked = !!u.lockedUntil && u.lockedUntil.getTime() > now;
                  return (
                    <tr key={u.id}>
                      <td className="px-4 py-2.5">
                        <p className="font-semibold">{u.fullName}</p>
                        <p className="text-muted font-mono text-xs">
                          {u.username}
                          {u.email ? ` · ${u.email}` : ""}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">{ROLE_LABEL[u.role]}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-bold",
                            u.status === "ACTIVE" ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
                          )}
                        >
                          {STATUS_LABEL[u.status]}
                        </span>
                        {loginLocked && <span className="bg-warning-soft text-warning ml-1 rounded-full px-2 py-0.5 text-xs font-bold">Khóa tạm do sai mật khẩu</span>}
                        {u.mustChangePassword && <p className="text-muted mt-0.5 text-xs">Chưa đổi mật khẩu tạm</p>}
                      </td>
                      <td className="text-muted px-3 py-2.5 text-xs tabular-nums">{shortDateTime(u.createdAt)}</td>
                      <td className="px-4 py-2.5 text-right">
                        {u.id !== actor.id && <UserActions userId={u.id} name={u.fullName} status={u.status} loginLocked={loginLocked} />}
                      </td>
                    </tr>
                  );
                })}
                {list.rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted px-4 py-8 text-center">Không có người dùng phù hợp.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <nav aria-label="Phân trang" className="border-border flex items-center justify-between border-t p-3 text-sm">
              <span className="text-muted">Trang {list.page}/{pages} · {list.total} người</span>
              <div className="flex gap-2">
                {list.page > 1 && <Link href={qs(list.page - 1)} className="font-bold">← Trước</Link>}
                {list.page < pages && <Link href={qs(list.page + 1)} className="font-bold">Sau →</Link>}
              </div>
            </nav>
          )}
        </section>
        <CreateTeacherForm />
      </div>
    </>
  );
}
