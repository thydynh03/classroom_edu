import Link from "next/link";
import type {
  listOnlineUsers,
  listPendingTeachers,
  listUsers,
} from "@/server/services/admin";
import { shortDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PendingTeacherActions, UserActions } from "./user-actions";

/** Phần dùng chung giữa /admin và /mod (kiểm duyệt viên). */

export const ROLE_LABEL = {
  ADMIN: "Quản trị",
  MODERATOR: "Kiểm duyệt viên",
  TEACHER: "Giáo viên",
  STUDENT: "Học sinh",
} as const;
const STATUS_LABEL = {
  ACTIVE: "Hoạt động",
  LOCKED: "Đã khóa",
  DISABLED: "Vô hiệu",
} as const;
export type RoleFilter = keyof typeof ROLE_LABEL;
export type StatusFilter = keyof typeof STATUS_LABEL;

export function OnlineAndPending({
  online,
  pendingTeachers,
}: {
  online: Awaited<ReturnType<typeof listOnlineUsers>>;
  pendingTeachers: Awaited<ReturnType<typeof listPendingTeachers>>;
}) {
  return (
    <>
      <section
        aria-labelledby="online-title"
        className="bg-surface border-border rounded-card mb-6 border p-5"
      >
        <h2 id="online-title" className="text-[15px] font-bold">
          Đang hoạt động ({online.length})
        </h2>
        <p className="text-muted mb-3 text-sm">
          Tài khoản có thao tác trong 15 phút gần đây.
        </p>
        {online.length === 0 ? (
          <p className="text-muted text-sm">Hiện không có ai đang dùng.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {online.map((u) => (
              <li
                key={u.id}
                className="border-border rounded-control flex items-center gap-2 border px-3 py-1.5 text-sm"
              >
                <span aria-hidden className="bg-success size-2 rounded-full" />
                <span className="font-semibold">{u.fullName}</span>
                <span className="text-muted text-xs">
                  {ROLE_LABEL[u.role]} · {shortDateTime(u.lastSeenAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {pendingTeachers.length > 0 && (
        <section
          aria-labelledby="pending-title"
          className="bg-warning-soft border-warning/30 rounded-card mb-6 border p-5"
        >
          <h2 id="pending-title" className="text-[15px] font-bold">
            Giáo viên chờ duyệt ({pendingTeachers.length})
          </h2>
          <p className="text-muted mb-3 text-sm">
            Tài khoản tự đăng ký. Kiểm tra họ tên và email trường trước khi
            duyệt; chưa duyệt thì chưa tạo được lớp.
          </p>
          <ul className="divide-border bg-surface rounded-tile divide-y">
            {pendingTeachers.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t.fullName}</p>
                  <p className="text-muted truncate text-xs">
                    <span className="font-mono">{t.username}</span> ·{" "}
                    {t.email ?? "không có email"} · đăng ký{" "}
                    {shortDateTime(t.createdAt)}
                  </p>
                </div>
                <PendingTeacherActions userId={t.id} name={t.fullName} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export function UsersTable({
  list,
  sp,
  role,
  status,
  roles,
  actorId,
  now,
  canDelete,
}: {
  list: Awaited<ReturnType<typeof listUsers>>;
  sp: { q?: string };
  role?: RoleFilter;
  status?: StatusFilter;
  roles: RoleFilter[];
  actorId: string;
  now: number;
  canDelete: boolean;
}) {
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
    <section className="bg-surface border-border rounded-card min-w-0 border">
      <form
        className="border-border flex flex-wrap items-end gap-2 border-b p-4"
        role="search"
      >
        <div className="min-w-48 flex-1 space-y-1">
          <label htmlFor="q" className="text-muted text-xs font-semibold">
            Tìm theo tên, tên đăng nhập, email
          </label>
          <input
            id="q"
            name="q"
            defaultValue={sp.q ?? ""}
            className="border-border bg-surface rounded-control h-10 w-full border px-3 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="role" className="text-muted text-xs font-semibold">
            Vai trò
          </label>
          <select
            id="role"
            name="role"
            defaultValue={role ?? ""}
            className="border-border bg-surface rounded-control h-10 border px-2 text-sm"
          >
            <option value="">Tất cả</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="status" className="text-muted text-xs font-semibold">
            Trạng thái
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className="border-border bg-surface rounded-control h-10 border px-2 text-sm"
          >
            <option value="">Tất cả</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="LOCKED">Đã khóa</option>
            <option value="DISABLED">Vô hiệu</option>
          </select>
        </div>
        <button
          type="submit"
          className="bg-primary text-on-primary rounded-control h-10 px-4 text-sm font-bold"
        >
          Lọc
        </button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Danh sách người dùng</caption>
          <thead className="text-muted text-left text-xs">
            <tr className="border-border border-b">
              <th scope="col" className="px-4 py-2 font-semibold">
                Người dùng
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Vai trò
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Trạng thái
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Truy cập
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Tạo lúc
              </th>
              <th scope="col" className="px-4 py-2 text-right font-semibold">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {list.rows.map((u) => {
              const loginLocked =
                !!u.lockedUntil && u.lockedUntil.getTime() > now;
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
                        u.status === "ACTIVE"
                          ? "bg-success-soft text-success"
                          : "bg-danger-soft text-danger"
                      )}
                    >
                      {STATUS_LABEL[u.status]}
                    </span>
                    {loginLocked && (
                      <span className="bg-warning-soft text-warning ml-1 rounded-full px-2 py-0.5 text-xs font-bold">
                        Khóa tạm do sai mật khẩu
                      </span>
                    )}
                    {u.mustChangePassword && (
                      <p className="text-muted mt-0.5 text-xs">
                        Chưa đổi mật khẩu tạm
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {u.lastSeenAt &&
                    now - u.lastSeenAt.getTime() < 15 * 60_000 ? (
                      <span className="text-success inline-flex items-center gap-1.5 font-bold">
                        <span
                          aria-hidden
                          className="bg-success size-2 rounded-full"
                        />
                        Đang online
                      </span>
                    ) : (
                      <span className="text-muted inline-flex items-center gap-1.5">
                        <span
                          aria-hidden
                          className="bg-border size-2 rounded-full"
                        />
                        {u.lastSeenAt
                          ? `Offline · ${shortDateTime(u.lastSeenAt)}`
                          : "Offline"}
                      </span>
                    )}
                  </td>
                  <td className="text-muted px-3 py-2.5 text-xs tabular-nums">
                    {shortDateTime(u.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {u.id !== actorId && (
                      <UserActions
                        userId={u.id}
                        name={u.fullName}
                        status={u.status}
                        loginLocked={loginLocked}
                        canDelete={canDelete}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
            {list.rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted px-4 py-8 text-center">
                  Không có người dùng phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav
          aria-label="Phân trang"
          className="border-border flex items-center justify-between border-t p-3 text-sm"
        >
          <span className="text-muted">
            Trang {list.page}/{pages} · {list.total} người
          </span>
          <div className="flex gap-2">
            {list.page > 1 && (
              <Link href={qs(list.page - 1)} className="font-bold">
                ← Trước
              </Link>
            )}
            {list.page < pages && (
              <Link href={qs(list.page + 1)} className="font-bold">
                Sau →
              </Link>
            )}
          </div>
        </nav>
      )}
    </section>
  );
}
