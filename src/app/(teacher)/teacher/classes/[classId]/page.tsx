import Link from "next/link";
import { Plus } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { requireTeacherOfClass } from "@/server/policy";
import { classAssignmentsWithStats, listClassStudents } from "@/server/services/classes";
import { classHeatmap } from "@/server/services/dashboard";
import { ClassChip } from "@/components/domain/class-chip";
import { AssignmentRow } from "@/components/domain/assignment-row";
import { Heatmap } from "@/components/domain/heatmap";
import { EmptyState, LinkButton, PageHeader } from "@/components/domain/page-parts";
import { StudentsPanel } from "./students-panel";
import { SettingsPanel } from "./settings-panel";
import { cn } from "@/lib/utils";
import { requestNow } from "@/lib/now";

const TABS = [
  { id: "assignments", label: "Bài tập" },
  { id: "students", label: "Học sinh" },
  { id: "tracking", label: "Theo dõi" },
  { id: "settings", label: "Cài đặt" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const actor = await requireActor("TEACHER");
  const { classId } = await params;
  const { tab: rawTab } = await searchParams;
  const tab: Tab = (TABS.find((t) => t.id === rawTab)?.id ?? "assignments") as Tab;
  const cls = await requireTeacherOfClass(actor, classId);

  return (
    <>
      <PageHeader
        back={{ href: "/teacher/classes", label: "Lớp học" }}
        eyebrow={<ClassChip color={cls.color}>{cls.subject}{cls.schoolYear ? ` · ${cls.schoolYear}` : ""}</ClassChip>}
        title={cls.name}
        description={cls.status === "ARCHIVED" ? "Lớp đã lưu trữ. Học sinh không còn thấy lớp này." : undefined}
        actions={
          <LinkButton href={`/teacher/assignments/new?classId=${cls.id}`}>
            <Plus aria-hidden="true" /> Giao bài
          </LinkButton>
        }
      />
      <nav aria-label="Mục của lớp" className="border-border mb-5 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`?tab=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap",
              tab === t.id ? "border-primary text-foreground" : "text-muted hover:text-foreground border-transparent",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "assignments" && <AssignmentsTab actor={actor} classId={cls.id} />}
      {tab === "students" && (
        <StudentsPanel
          classId={cls.id}
          className={cls.name}
          loginUrl={new URL("/login", process.env.APP_URL ?? "http://localhost:3000").toString()}
          students={(await listClassStudents(actor, cls.id)).map((s) => ({
            id: s.id,
            fullName: s.fullName,
            username: s.username,
            status: s.status,
            mustChangePassword: s.mustChangePassword,
            locked: !!s.lockedUntil && s.lockedUntil.getTime() > requestNow(),
          }))}
        />
      )}
      {tab === "tracking" && <TrackingTab actor={actor} classId={cls.id} />}
      {tab === "settings" && (
        <SettingsPanel
          cls={cls}
          joinUrl={new URL(`/join/${cls.joinCode}`, process.env.APP_URL ?? "http://localhost:3000").toString()}
        />
      )}
    </>
  );
}

async function AssignmentsTab({ actor, classId }: { actor: Awaited<ReturnType<typeof requireActor>>; classId: string }) {
  const list = await classAssignmentsWithStats(actor, classId);
  if (!list.length)
    return (
      <EmptyState
        title="Lớp chưa có bài tập"
        description="Giao bài đầu tiên cho lớp này."
        action={<LinkButton href={`/teacher/assignments/new?classId=${classId}`}>Giao bài</LinkButton>}
      />
    );
  return (
    <div className="bg-surface border-border rounded-card divide-border divide-y overflow-hidden border">
      {list.map((a) => (
        <AssignmentRow key={a.id} a={a} />
      ))}
    </div>
  );
}

async function TrackingTab({ actor, classId }: { actor: Awaited<ReturnType<typeof requireActor>>; classId: string }) {
  const { cols, rows } = await classHeatmap(actor, classId);
  return (
    <section className="bg-surface border-border rounded-card border p-5">
      <h2 className="mb-1 text-[15px] font-bold">Nộp bài theo học sinh</h2>
      <p className="text-muted mb-4 text-sm">{cols.length} bài gần nhất. Nhìn theo hàng để thấy em nào hay nộp trễ hoặc bỏ bài.</p>
      <Heatmap cols={cols} rows={rows} />
    </section>
  );
}
