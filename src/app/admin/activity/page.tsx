import { requireActor } from "@/server/auth/guard";
import { activityOverview, userTimeline } from "@/server/services/ops";
import { PageHeader, Panel } from "@/components/domain/page-parts";
import { shortDateTime } from "@/lib/dates";
import { TimelineSearch } from "./timeline-search";

export const metadata = { title: "Hành vi người dùng · Quản trị · Classroom Edu" };

const EVENT_LABEL: Record<string, string> = {
  login: "Đăng nhập",
  "assignment.open": "HS mở bài",
  "submission.submit": "Nộp bài tự luận",
  "quiz.submit": "Nộp trắc nghiệm",
  "grade.save": "Lưu điểm",
  "grade.return": "Trả bài",
  "class.create": "Tạo lớp",
  "assignment.create": "Tạo bài tập",
  "material.create": "Đăng tài liệu",
  "upload.complete": "Tải file lên",
  "upgrade.view": "Xem trang Nâng cao",
  "upgrade.request": "Yêu cầu mở khóa",
  "push.enable": "Bật thông báo đẩy",
  "quiz.import": "Nhập đề Word/Excel",
};
const DEVICE_LABEL: Record<string, string> = { mobile: "Điện thoại", tablet: "Máy tính bảng", desktop: "Máy tính", unknown: "Không rõ" };
const DOW = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const actor = await requireActor("ADMIN");
  const { u } = await searchParams;
  const [a, timeline] = await Promise.all([activityOverview(actor), u ? userTimeline(actor, u.slice(0, 64)) : Promise.resolve(undefined)]);
  const maxDaily = Math.max(1, ...a.daily.map((d) => d.users));
  const maxHeat = Math.max(1, ...a.heat.map((h) => h.total));
  const heatAt = (dow: number, hour: number) => a.heat.find((x) => x.dow === dow && x.hour === hour)?.total ?? 0;
  const f = a.funnel;
  const funnel = [
    ["Lượt giao bài", f.assigned],
    ["HS bắt đầu làm", f.started],
    ["Đã nộp", f.submitted],
    ["Đã được trả bài", f.returned],
  ] as const;

  return (
    <>
      <PageHeader title="Hành vi người dùng" description="Số liệu 30 ngày gần nhất. Chỉ ghi loại thao tác, không ghi nội dung bài làm, điểm hay nhận xét." />
      <dl className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["Hoạt động hôm nay", a.active.dau],
          ["7 ngày", a.active.wau],
          ["30 ngày", a.active.mau],
          ["Giáo viên (30 ngày)", a.active.mauTeacher],
          ["Học sinh (30 ngày)", a.active.mauStudent],
        ].map(([l, v]) => (
          <div key={l} className="bg-surface border-border rounded-card border p-4">
            <dd className="text-2xl font-extrabold tabular-nums">{v}</dd>
            <dt className="text-muted text-xs font-semibold">{l}</dt>
          </div>
        ))}
      </dl>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Người dùng hoạt động theo ngày (14 ngày)">
          {a.daily.length === 0 ? (
            <p className="text-muted text-sm">Chưa có số liệu.</p>
          ) : (
            <ol className="space-y-1.5" aria-label="Số người dùng mỗi ngày">
              {a.daily.map((d) => (
                <li key={d.day} className="flex items-center gap-2 text-xs">
                  <span className="text-muted w-12 shrink-0 tabular-nums">{d.day.slice(5).split("-").reverse().join("/")}</span>
                  <span className="bg-surface-2 h-3 flex-1 overflow-hidden rounded-full" aria-hidden="true">
                    <span className="bg-primary block h-full rounded-full" style={{ width: `${(d.users / maxDaily) * 100}%` }} />
                  </span>
                  <span className="w-28 shrink-0 text-right tabular-nums">
                    {d.users} người · {d.submissions} nộp
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Phễu giao bài → trả bài (30 ngày)">
          <ol className="space-y-2">
            {funnel.map(([label, v], i) => {
              const pct = f.assigned ? Math.round((v / f.assigned) * 100) : 0;
              return (
                <li key={label} className="text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold">{label}</span>
                    <span className="tabular-nums">
                      {v.toLocaleString("vi-VN")}
                      {i > 0 && f.assigned ? ` · ${pct}%` : ""}
                    </span>
                  </div>
                  <div className="bg-surface-2 mt-1 h-2.5 overflow-hidden rounded-full" aria-hidden="true">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${i === 0 ? 100 : pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>

        <Panel title="Thiết bị (30 ngày)">
          {a.devices.length === 0 ? (
            <p className="text-muted text-sm">Chưa có số liệu.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-muted text-left text-xs">
                <tr>
                  <th scope="col">Thiết bị</th>
                  <th scope="col">Vai trò</th>
                  <th scope="col" className="text-right">Người dùng</th>
                </tr>
              </thead>
              <tbody>
                {a.devices.map((d) => (
                  <tr key={`${d.device}-${d.role}`}>
                    <td className="py-1">{DEVICE_LABEL[d.device] ?? d.device}</td>
                    <td className="py-1">{d.role === "TEACHER" ? "Giáo viên" : d.role === "STUDENT" ? "Học sinh" : d.role === "MODERATOR" ? "Kiểm duyệt viên" : "Quản trị"}</td>
                    <td className="py-1 text-right tabular-nums">{d.users}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Mức dùng tính năng (30 ngày)">
          {a.features.length === 0 ? (
            <p className="text-muted text-sm">Chưa có số liệu.</p>
          ) : (
            <ul className="divide-border divide-y text-sm">
              {a.features.map((x) => (
                <li key={x.event} className="flex justify-between py-1.5">
                  <span>{EVENT_LABEL[x.event] ?? x.event}</span>
                  <span className="text-muted tabular-nums">
                    {x.total} lượt · {x.users} người
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Giờ cao điểm (giờ Việt Nam, 30 ngày)" className="mt-5">
        <div className="overflow-x-auto">
          <table className="text-[10px]" aria-label="Số thao tác theo thứ và giờ">
            <thead>
              <tr>
                <th scope="col" />
                {Array.from({ length: 24 }, (_, hh) => (
                  <th key={hh} scope="col" className="text-muted w-6 font-normal">
                    {hh}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DOW.map((d, i) => (
                <tr key={d}>
                  <th scope="row" className="text-muted pr-2 text-left font-semibold">
                    {d}
                  </th>
                  {Array.from({ length: 24 }, (_, hh) => {
                    const v = heatAt(i + 1, hh);
                    return (
                      <td key={hh} className="p-0.5">
                        <span
                          className="bg-primary block size-5 rounded-[4px]"
                          style={{ opacity: v ? 0.15 + 0.85 * (v / maxHeat) : 0.05 }}
                          title={`${d} ${hh}h: ${v} thao tác`}
                        >
                          <span className="sr-only">
                            {d} {hh} giờ: {v}
                          </span>
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Dòng thời gian của một tài khoản" className="mt-5">
        <p className="text-muted mb-3 text-sm">Dùng khi hỗ trợ người dùng. Mỗi lần xem được ghi vào Nhật ký.</p>
        <TimelineSearch initial={u ?? ""} />
        {timeline === null && <p className="text-danger mt-3 text-sm">Không tìm thấy tài khoản “{u}”.</p>}
        {timeline && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold">
              {timeline.user.fullName} · <span className="font-mono">{timeline.user.username}</span>
            </p>
            {timeline.events.length === 0 ? (
              <p className="text-muted text-sm">Không có hoạt động trong 90 ngày.</p>
            ) : (
              <ol className="divide-border divide-y text-sm">
                {timeline.events.map((e, i) => (
                  <li key={i} className="flex justify-between gap-2 py-1.5">
                    <span>{EVENT_LABEL[e.event] ?? e.event}</span>
                    <span className="text-muted text-xs">
                      {DEVICE_LABEL[e.device ?? "unknown"]} · {shortDateTime(e.at)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </Panel>
    </>
  );
}
