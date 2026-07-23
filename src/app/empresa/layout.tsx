import { requireCompanyAdmin } from "@/lib/session";
import { getNotifications } from "@/lib/notifications";
import { getCompany } from "@/server/queries";
import { AppShell } from "@/components/shell/app-shell";
import { navFor, subtitleFor } from "@/components/shell/nav";

export default async function EmpresaLayout({ children }: { children: React.ReactNode }) {
  const { user, scope, companyId } = await requireCompanyAdmin();
  const [notifications, company] = await Promise.all([
    getNotifications(user.id),
    getCompany(scope, companyId),
  ]);

  return (
    <AppShell
      nav={navFor("COMPANY_ADMIN")}
      subtitle={subtitleFor("COMPANY_ADMIN")}
      user={{ name: user.name, detail: company.name }}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
