import { requireActor } from "@/server/auth/guard";
import { listOnlineUsers, listPendingTeachers, listUsers } from "@/server/services/admin";
import { PageHeader } from "@/components/domain/page-parts";
import { requestNow } from "@/lib/now";
import { OnlineAndPending, UsersTable } from "@/app/admin/users-panel";

export const metadata = { title: "Kiểm duyệt · Classroom Edu" };

export default async function ModPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }>;
}) {
  const actor = await requireActor("MODERATOR");
  const sp = await searchParams;
  const role = (["TEACHER", "STUDENT"] as const).find((r) => r === sp.role);
  const status = (["ACTIVE", "LOCKED", "DISABLED"] as const).find((r) => r === sp.status);
  const [list, pendingTeachers, online] = await Promise.all([
    listUsers(actor, { q: sp.q, role, status, page: Number(sp.page) || 1 }),
    listPendingTeachers(actor),
    listOnlineUsers(actor),
  ]);
  return (
    <>
      <PageHeader title="Giáo viên và học sinh" description="Duyệt giáo viên tự đăng ký, khóa hoặc mở khóa tài khoản, cấp mật khẩu tạm khi người dùng quên mật khẩu." />
      <OnlineAndPending online={online} pendingTeachers={pendingTeachers} />
      <UsersTable list={list} sp={sp} role={role} status={status} roles={["TEACHER", "STUDENT"]} actorId={actor.id} now={requestNow()} canDelete={false} />
    </>
  );
}
