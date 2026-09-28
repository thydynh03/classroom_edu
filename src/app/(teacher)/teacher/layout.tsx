import * as React from "react";
import { AppRail, MobileTabBar, TopBar } from "@/components/layout";
import { requireActor } from "@/server/auth/guard";
import { publishDueLazily } from "@/server/jobs/deadlines";
import { unreadCount } from "@/server/services/notifications";
import { gradingQueue } from "@/server/services/submissions";
import { longDateVN } from "@/lib/dates";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor("TEACHER");
  publishDueLazily();
  const [unread, queue] = await Promise.all([unreadCount(actor.id), gradingQueue(actor)]);
  const pending = queue.reduce((s, q) => s + q.pending, 0);
  return (
    <div className="bg-background text-foreground flex min-h-screen">
      <AppRail
        role="teacher"
        pendingCount={pending}
        userName={actor.fullName}
        userSubtitle="Giáo viên"
        className="sticky top-0 hidden h-screen shrink-0 md:flex"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={`Chào ${actor.fullName.split(" ").pop()}`}
          subtitle={longDateVN()}
          createHref="/teacher/assignments/new"
          notificationsHref="/teacher/notifications"
          unreadCount={unread}
          userName={actor.fullName}
        />
        <main id="main" className="min-h-0 flex-1 px-4 py-6 pb-28 md:px-8 md:pb-10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
      <MobileTabBar role="teacher" pendingCount={pending} unreadCount={unread} className="md:hidden" />
    </div>
  );
}
