import { notFound } from "next/navigation";
import { requireStudio } from "@/lib/session";
import { getEmployeeDetail } from "@/server/queries";
import { ServiceError } from "@/server/scope";
import { EmployeeDetail } from "@/components/employee-detail";

export default async function EmpleadoEstudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { scope } = await requireStudio();
  const { id } = await params;

  const employee = await getEmployeeDetail(scope, id).catch((e) => {
    if (e instanceof ServiceError && e.status === 404) notFound();
    throw e;
  });

  return (
    <EmployeeDetail
      employee={employee}
      backHref={`/estudio/empresas/${employee.company.id}`}
      backLabel={employee.company.name}
      showCompany
    />
  );
}
