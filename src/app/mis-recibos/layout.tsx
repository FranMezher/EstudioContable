import { requireEmployee } from "@/lib/session";
import { getNotifications } from "@/lib/notifications";
import { AppShell } from "@/components/shell/app-shell";

export default async function MisRecibosLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireEmployee();
  const notifications = await getNotifications(user.id);

  return (
    <AppShell role="EMPLOYEE" user={{ name: user.name, detail: "Empleado" }} notifications={notifications}>
      {children}
    </AppShell>
  );
}
