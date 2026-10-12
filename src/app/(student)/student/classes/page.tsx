import Link from "next/link";
import { BookOpen } from "lucide-react";
import { requireActor } from "@/server/auth/guard";
import { listMyInvites, listStudentClasses } from "@/server/services/classes";
import { COLOR_CLASSES } from "@/components/domain/class-chip";
import { EmptyState, PageHeader } from "@/components/domain/page-parts";
import { cn } from "@/lib/utils";
import { JoinByCode } from "./join-by-code";
import { InviteList } from "./invite-list";

export const metadata = { title: "Lớp học · Classroom Edu" };

export default async function StudentClassesPage() {
  const actor = await requireActor("STUDENT");
  const [classes, invites] = await Promise.all([listStudentClasses(actor), listMyInvites(actor)]);
  return (
    <>
      <PageHeader title="Lớp học" description={`${classes.length} lớp`} />
      <InviteList invites={invites} />
      <div className="mb-6">
        <JoinByCode />
      </div>
      {classes.length === 0 ? (
        <EmptyState icon={<BookOpen className="size-6" />} title="Bạn chưa tham gia lớp nào" description="Nhập mã lớp giáo viên gửi ở ô bên trên." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {classes.map((c) => (
            <li key={c.id}>
              <Link href={`/student/classes/${c.id}`} className="bg-surface border-border rounded-card block overflow-hidden border">
                <div className={cn("flex h-20 items-end p-4", COLOR_CLASSES[c.color])}>
                  <p className="text-lg font-extrabold">{c.name}</p>
                </div>
                <p className="text-muted p-4 text-sm">
                  {c.subject} · {c.teacherName}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
