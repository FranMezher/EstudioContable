import { requireCompanyAdmin } from "@/lib/session";
import { getNotifications } from "@/lib/notifications";
import { getCompany } from "@/server/queries";
import { AppShell } from "@/components/shell/app-shell";

export default async function EmpresaLayout({ children }: { children: React.ReactNode }) {
  const { user, scope, companyId } = await requireCompanyAdmin();
  const [notifications, company] = await Promise.all([
    getNotifications(user.id),
    getCompany(scope, companyId),
  ]);

  return (
    <AppShell role="COMPANY_ADMIN" user={{ name: user.name, detail: company.name }} notifications={notifications}>
      {children}
    </AppShell>
  );
}
