import { requireActor } from "@/server/auth/guard";
import { listNotifications } from "@/server/services/notifications";
import { PageHeader } from "@/components/domain/page-parts";
import { NotificationList } from "@/components/domain/notification-list";

export const metadata = { title: "Thông báo · Classroom Edu" };

export default async function TeacherNotificationsPage() {
  const actor = await requireActor("TEACHER");
  const items = await listNotifications(actor.id);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Thông báo" />
      <NotificationList items={items.map((n) => ({ ...n, createdAt: n.createdAt.toISOString(), readAt: n.readAt?.toISOString() ?? null }))} />
    </div>
  );
}
