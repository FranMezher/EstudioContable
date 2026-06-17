import { requireClient } from "@/lib/session";
import { getEmployees } from "@/server/queries";
import { PageHeader } from "@/components/page-header";
import { PayslipsSection } from "@/components/sections/payslips-section";

export default async function PortalRecibosPage() {
  const user = await requireClient();
  const employees = await getEmployees(user.clientId);

  return (
    <>
      <PageHeader
        title="Recibos de Sueldo"
        description="Empleados y sus recibos por período."
      />
      <PayslipsSection employees={employees} />
    </>
  );
}
