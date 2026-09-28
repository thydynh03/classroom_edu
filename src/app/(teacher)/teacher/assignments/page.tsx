import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { listTeacherAssignments } from "@/server/services/assignments";
import { AssignmentRow } from "@/components/domain/assignment-row";
import { EmptyState, LinkButton, PageHeader } from "@/components/domain/page-parts";
import { cn } from "@/lib/utils";

export const metadata = { title: "Bài tập · Classroom Edu" };

const FILTERS = [
  { id: "PUBLISHED", label: "Đang mở" },
  { id: "SCHEDULED", label: "Đã lên lịch" },
  { id: "DRAFT", label: "Nháp" },
  { id: "ARCHIVED", label: "Lưu trữ" },
] as const;

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const actor = await requireActor("TEACHER");
  const { status: raw } = await searchParams;
  const status = FILTERS.find((f) => f.id === raw)?.id ?? "PUBLISHED";
  const list = await listTeacherAssignments(actor, { status });
  return (
    <>
      <PageHeader
        title="Bài tập"
        description="Tất cả bài tập ở mọi lớp"
        actions={
          <LinkButton href="/teacher/assignments/new">
            <Plus aria-hidden="true" /> Giao bài
          </LinkButton>
        }
      />
      <nav aria-label="Lọc theo trạng thái" className="border-border mb-5 flex gap-1 border-b">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={`?status=${f.id}`}
            aria-current={status === f.id ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3.5 py-2.5 text-sm font-semibold",
              status === f.id ? "border-primary text-foreground" : "text-muted hover:text-foreground border-transparent",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-6" />}
          title={status === "PUBLISHED" ? "Chưa có bài nào đang mở" : status === "DRAFT" ? "Không có bài nháp" : status === "SCHEDULED" ? "Không có bài nào đang chờ đăng" : "Chưa lưu trữ bài nào"}
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
