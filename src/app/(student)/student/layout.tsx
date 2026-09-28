import * as React from "react";
import { AppRail, MobileTabBar, TopBar } from "@/components/layout";
import { requireActor } from "@/server/auth/guard";
import { unreadCount } from "@/server/services/notifications";
import { longDateVN } from "@/lib/dates";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor("STUDENT");
  const unread = await unreadCount(actor.id);
  return (
    <div className="bg-background text-foreground flex min-h-screen">
      <AppRail
        role="student"
        unreadCount={unread}
        userName={actor.fullName}
        userSubtitle="Học sinh"
        className="sticky top-0 hidden h-screen shrink-0 md:flex"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={`Chào ${actor.fullName.split(" ").pop()}`}
          subtitle={longDateVN()}
          notificationsHref="/student/notifications"
          unreadCount={unread}
          userName={actor.fullName}
        />
        <main id="main" className="min-h-0 flex-1 px-4 py-6 pb-28 md:px-8 md:pb-10">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
      <MobileTabBar role="student" unreadCount={unread} className="md:hidden" />
    </div>
  );
}
