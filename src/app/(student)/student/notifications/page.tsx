import { requireActor } from "@/server/auth/guard";
import { listNotifications } from "@/server/services/notifications";
import { PageHeader } from "@/components/domain/page-parts";
import { NotificationList } from "@/components/domain/notification-list";

export const metadata = { title: "Thông báo · Classroom Edu" };

export default async function StudentNotificationsPage() {
  const actor = await requireActor("STUDENT");
  const items = await listNotifications(actor.id);
  return (
    <>
      <PageHeader title="Thông báo" />
      <NotificationList items={items.map((n) => ({ ...n, createdAt: n.createdAt.toISOString(), readAt: n.readAt?.toISOString() ?? null }))} />
    </>
  );
}
