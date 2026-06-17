import { requireAdmin } from "@/lib/session";
import { getNotifications } from "@/lib/notifications";
import { AppShell } from "@/components/shell/app-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  const notifications = await getNotifications(user.id);

  return (
    <AppShell
      variant="admin"
      user={{ name: user.name ?? "Administrador", subtitle: "Estudio" }}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
