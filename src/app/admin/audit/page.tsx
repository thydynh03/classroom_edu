import { requireActor } from "@/server/auth/guard";
import { recentAudit } from "@/server/services/admin";
import { PageHeader } from "@/components/domain/page-parts";
import { shortDateTime } from "@/lib/dates";

export const metadata = { title: "Nhật ký · Quản trị" };

const ACTION_LABEL: Record<string, string> = {
  "students.bulk_create": "Tạo học sinh hàng loạt",
  "student.reset_password": "GV cấp lại mật khẩu HS",
  "user.status.locked": "Khóa tài khoản",
  "user.status.disabled": "Vô hiệu tài khoản",
  "user.status.active": "Mở khóa tài khoản",
  "user.unlock_login": "Gỡ khóa tạm đăng nhập",
  "user.reset_password": "Admin cấp mật khẩu tạm",
  "user.create_teacher": "Tạo giáo viên",
  "file.infected": "Chặn file có mã độc",
};

export default async function AuditPage() {
  const actor = await requireActor("ADMIN");
  const rows = await recentAudit(actor);
  return (
    <>
      <PageHeader title="Nhật ký hoạt động" description="100 thao tác nhạy cảm gần nhất." />
      <div className="bg-surface border-border rounded-card overflow-x-auto border">
        <table className="w-full text-sm">
          <caption className="sr-only">Nhật ký hoạt động</caption>
          <thead className="text-muted text-left text-xs">
            <tr className="border-border border-b">
              <th scope="col" className="px-4 py-2 font-semibold">Thời gian</th>
              <th scope="col" className="px-3 py-2 font-semibold">Người thực hiện</th>
              <th scope="col" className="px-3 py-2 font-semibold">Thao tác</th>
              <th scope="col" className="px-4 py-2 font-semibold">Đối tượng</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="text-muted px-4 py-2.5 tabular-nums">{shortDateTime(r.createdAt)}</td>
                <td className="px-3 py-2.5">{r.actorName ?? "Hệ thống"}</td>
                <td className="px-3 py-2.5 font-semibold">{ACTION_LABEL[r.action] ?? r.action}</td>
                <td className="text-muted px-4 py-2.5 font-mono text-xs">
                  {r.targetType}:{r.targetId?.slice(0, 8)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted px-4 py-8 text-center">Chưa có hoạt động nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
