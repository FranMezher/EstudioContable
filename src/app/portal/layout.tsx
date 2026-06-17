import { requireClient } from "@/lib/session";
import { getNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/shell/app-shell";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireClient();
  const [notifications, client] = await Promise.all([
    getNotifications(user.id),
    prisma.client.findUnique({ where: { id: user.clientId }, select: { name: true } }),
  ]);

  return (
    <AppShell
      variant="portal"
      user={{ name: user.name ?? "Cliente", subtitle: client?.name ?? "" }}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
