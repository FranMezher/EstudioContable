import { requireCompanyAdmin } from "@/lib/session";
import { getUsers } from "@/server/users-queries";
import { PageHeader } from "@/components/page-header";
import { UsersManager } from "@/components/forms/users-manager";

export default async function AccesosEmpresaPage() {
  const { scope } = await requireCompanyAdmin();
  // getUsers acota al alcance: nunca aparecen usuarios de otra empresa.
  const users = await getUsers(scope);

  return (
    <>
      <PageHeader
        title="Accesos"
        description="Quiénes pueden entrar al portal de tu empresa."
      />
      <UsersManager users={users} canCreateStudioAdmin={false} />
    </>
  );
}
