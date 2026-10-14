import { requireActor } from "@/server/auth/guard";
import { adminCharts, adminStats, listOnlineUsers, listPendingTeachers, listUsers } from "@/server/services/admin";
import { DonutChart, LineChart } from "@/components/domain/charts";
import { PageHeader } from "@/components/domain/page-parts";
import { requestNow } from "@/lib/now";
import { CreateTeacherForm } from "./user-actions";
import { OnlineAndPending, UsersTable } from "./users-panel";

export const metadata = { title: "Quản trị · Classroom Edu" };


export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }>;
}) {
  const actor = await requireActor("ADMIN");
  const sp = await searchParams;
  const role = (["ADMIN", "MODERATOR", "TEACHER", "STUDENT"] as const).find((r) => r === sp.role);
  const status = (["ACTIVE", "LOCKED", "DISABLED"] as const).find((r) => r === sp.status);
  const page = Number(sp.page) || 1;
  const [stats, charts, list, pendingTeachers, online] = await Promise.all([
    adminStats(actor),
    adminCharts(actor),
    listUsers(actor, { q: sp.q, role, status, page }),
    listPendingTeachers(actor),
    listOnlineUsers(actor),
  ]);
  const now = requestNow();
  return (
    <>
      <PageHeader title="Tổng quan" description="Số liệu tổng hợp và quản lý tài khoản. Quản trị viên không xem được bài làm và điểm của học sinh." />
      <section aria-label="Biểu đồ tổng quan" className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="bg-surface border-border rounded-card border p-5 lg:col-span-3">
          <LineChart
            title="Hoạt động 14 ngày qua"
            labels={charts.days}
            series={[
              { label: "Người dùng hoạt động", values: charts.activeUsersPerDay },
              { label: "Bài nộp", values: charts.submissionsPerDay },
            ]}
          />
        </div>
        <div className="bg-surface border-border rounded-card border p-5">
          <DonutChart
            title="Tài khoản theo vai trò"
            unit="tài khoản"
            slices={[
              { label: "Học sinh", value: stats.students },
              { label: "Giáo viên", value: stats.teachers },
              { label: "Quản trị", value: stats.admins },
            ]}
          />
        </div>
        <div className="bg-surface border-border rounded-card border p-5">
          <DonutChart
            title="Bài làm theo trạng thái"
            unit="bài làm"
            slices={[
              { label: "Chờ chấm", value: charts.submissionStatus.submitted },
              { label: "Đã trả", value: charts.submissionStatus.returned },
              { label: "Đã chấm, chưa trả", value: charts.submissionStatus.graded },
              { label: "Đang làm (nháp)", value: charts.submissionStatus.draft },
            ]}
          />
        </div>
        <div className="bg-surface border-border rounded-card border p-5">
          <DonutChart
            title="Thiết bị (30 ngày)"
            unit="người dùng"
            slices={[
              { label: "Điện thoại", value: charts.devices.mobile },
              { label: "Máy tính", value: charts.devices.desktop },
              { label: "Máy tính bảng", value: charts.devices.tablet },
              { label: "Khác", value: charts.devices.other },
            ]}
          />
        </div>
      </section>
      <OnlineAndPending online={online} pendingTeachers={pendingTeachers} />
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
        <UsersTable list={list} sp={sp} role={role} status={status} roles={["TEACHER", "STUDENT", "MODERATOR", "ADMIN"]} actorId={actor.id} now={now} canDelete />
        <CreateTeacherForm />
      </div>
    </>
  );
}
