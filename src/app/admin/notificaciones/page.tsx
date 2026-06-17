import { requireUser } from "@/lib/session";
import { getNotifications } from "@/lib/notifications";
import { PageHeader } from "@/components/page-header";
import { NotificationsPage } from "@/components/sections/notifications-page";

export default async function AdminNotificacionesPage() {
  const user = await requireUser();
  const items = await getNotifications(user.id);

  return (
    <>
      <PageHeader title="Notificaciones" description="Avisos del sistema." />
      <NotificationsPage items={items} />
    </>
  );
}
