import { requireEmployee } from "@/lib/session";
import { getNotifications } from "@/lib/notifications";
import { AppShell } from "@/components/shell/app-shell";
import { navFor, subtitleFor } from "@/components/shell/nav";

export default async function MisRecibosLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireEmployee();
  const notifications = await getNotifications(user.id);

  return (
    <AppShell
      nav={navFor("EMPLOYEE")}
      subtitle={subtitleFor("EMPLOYEE")}
      user={{ name: user.name, detail: "Empleado" }}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
