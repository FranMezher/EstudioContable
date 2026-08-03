import { requireStudio } from "@/lib/session";
import { getNotifications } from "@/lib/notifications";
import { AppShell } from "@/components/shell/app-shell";

export default async function EstudioLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireStudio();
  const notifications = await getNotifications(user.id);

  return (
    <AppShell role="STUDIO_ADMIN" user={{ name: user.name, detail: "Estudio" }} notifications={notifications}>
      {children}
    </AppShell>
  );
}
