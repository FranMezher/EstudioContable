import { notFound } from "next/navigation";
import { requireCompanyAdmin } from "@/lib/session";
import { getEmployeeDetail } from "@/server/queries";
import { ServiceError } from "@/server/scope";
import { EmployeeDetail } from "@/components/employee-detail";

export default async function EmpleadoEmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { scope } = await requireCompanyAdmin();
  const { id } = await params;

  // Un empleado de otra empresa no entra en el alcance: 404.
  const employee = await getEmployeeDetail(scope, id).catch((e) => {
    if (e instanceof ServiceError && e.status === 404) notFound();
    throw e;
  });

  return <EmployeeDetail employee={employee} backHref="/empresa" backLabel="Empleados" />;
}
