import { requireStudio } from "@/lib/session";
import { getNotifications } from "@/lib/notifications";
import { AppShell } from "@/components/shell/app-shell";
import { navFor, subtitleFor } from "@/components/shell/nav";

export default async function EstudioLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireStudio();
  const notifications = await getNotifications(user.id);

  return (
    <AppShell
      nav={navFor("STUDIO_ADMIN")}
      subtitle={subtitleFor("STUDIO_ADMIN")}
      user={{ name: user.name, detail: "Estudio" }}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
