import Link from "next/link";
import { ClipboardList, Library, Plus } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { listTeacherAssignments } from "@/server/services/assignments";
import { AssignmentRow } from "@/components/domain/assignment-row";
import { EmptyState, LinkButton, PageHeader, SummaryStrip } from "@/components/domain/page-parts";
import { requestNow } from "@/lib/now";
import { cn } from "@/lib/utils";

export const metadata = { title: "Bài tập · Classroom Edu" };

const FILTERS = [
  { id: "PUBLISHED", label: "Đang mở" },
  { id: "SCHEDULED", label: "Đã lên lịch" },
  { id: "DRAFT", label: "Nháp" },
  { id: "ARCHIVED", label: "Lưu trữ" },
] as const;

const WEEK = 7 * 86400_000;

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const actor = await requireActor("TEACHER");
  const { status: raw } = await searchParams;
  const status = FILTERS.find((f) => f.id === raw)?.id ?? "PUBLISHED";
  const all = await listTeacherAssignments(actor);
  const list = all.filter((a) => a.status === status);
  const open = all.filter((a) => a.status === "PUBLISHED");
  const now = requestNow();
  const dueSoon = open.filter((a) => a.dueAt.getTime() > now && a.dueAt.getTime() <= now + WEEK).length;
  const pending = open.reduce((s, a) => s + a.stats.pending, 0);
  const expected = open.reduce((s, a) => s + a.stats.total, 0);
  const submitted = open.reduce((s, a) => s + a.stats.submitted, 0);
  return (
    <>
      <PageHeader
        title="Bài tập"
        description="Tất cả bài tập ở mọi lớp"
        actions={
          <>
            <LinkButton href="/teacher/questions" variant="outline">
              <Library aria-hidden="true" /> Ngân hàng câu hỏi
            </LinkButton>
            <LinkButton href="/teacher/assignments/new">
              <Plus aria-hidden="true" /> Giao bài
            </LinkButton>
          </>
        }
      />
      {all.length > 0 && (
        <SummaryStrip
          items={[
            { label: "Đang mở", value: open.length, hint: `${all.length} bài tất cả` },
            { label: "Hạn trong 7 ngày", value: dueSoon, tone: dueSoon ? "warning" : "default" },
            { label: "Chờ chấm", value: pending, tone: pending ? "primary" : "default", hint: pending ? "mở mục Cần chấm để chấm" : "Đã chấm hết" },
            { label: "Tỉ lệ nộp", value: expected ? `${Math.round((submitted / expected) * 100)}%` : "—", hint: expected ? `${submitted}/${expected} lượt nộp` : "Chưa có học sinh" },
          ]}
        />
      )}
      <nav aria-label="Lọc theo trạng thái" className="border-border mb-5 flex gap-1 overflow-x-auto border-b">
        {FILTERS.map((f) => {
          const n = all.filter((a) => a.status === f.id).length;
          return (
            <Link
              key={f.id}
              href={`?status=${f.id}`}
              aria-current={status === f.id ? "page" : undefined}
              className={cn(
                "-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap",
                status === f.id ? "border-primary text-foreground" : "text-muted hover:text-foreground border-transparent",
              )}
            >
              {f.label}
              <span className={cn("rounded-full px-1.5 text-[11px] font-bold tabular-nums", status === f.id ? "bg-primary-soft text-primary" : "bg-surface-2 text-muted")}>{n}</span>
            </Link>
          );
        })}
      </nav>
      {list.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-6" />}
          title={status === "PUBLISHED" ? "Chưa có bài nào đang mở" : status === "DRAFT" ? "Không có bài nháp" : status === "SCHEDULED" ? "Không có bài nào đang chờ đăng" : "Chưa lưu trữ bài nào"}
          description={
            status === "PUBLISHED"
              ? "Giao bài tự luận hoặc trắc nghiệm, học sinh trong lớp sẽ nhận thông báo ngay."
              : status === "DRAFT"
                ? "Bài lưu nháp chưa hiện với học sinh; bạn có thể soạn dần rồi đăng sau."
                : status === "SCHEDULED"
                  ? "Đặt giờ đăng khi giao bài để bài tự mở đúng lúc."
                  : "Bài đã lưu trữ sẽ ẩn khỏi danh sách của học sinh nhưng vẫn giữ điểm."
          }
          action={status !== "ARCHIVED" ? <LinkButton href="/teacher/assignments/new">Giao bài</LinkButton> : undefined}
        />
      ) : (
        <div className="bg-surface border-border rounded-card divide-border divide-y overflow-hidden border">
          {list.map((a) => (
            <AssignmentRow key={a.id} a={a} className={a.className} classColor={a.classColor} />
          ))}
        </div>
      )}
    </>
  );
}
