import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireStudio } from "@/lib/session";
import { getCompany, getEmployees } from "@/server/queries";
import { ServiceError } from "@/server/scope";
import { formatCuil } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { EmployeeList } from "@/components/employee-list";
import { NewEmployeeForm } from "@/components/forms/new-employee-form";

export default async function EmpresaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { scope } = await requireStudio();
  const { id } = await params;

  // getCompany filtra por alcance: una empresa fuera del alcance es 404.
  const company = await getCompany(scope, id).catch((e) => {
    if (e instanceof ServiceError && e.status === 404) notFound();
    throw e;
  });
  const employees = await getEmployees(scope, { companyId: company.id });

  return (
    <>
      <Link
        href="/estudio/empresas"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Empresas
      </Link>

      <PageHeader
        title={company.name}
        description={[company.cuit ? formatCuil(company.cuit) : null, company.email, company.phone]
          .filter(Boolean)
          .join(" · ")}
        action={<NewEmployeeForm companyId={company.id} />}
      />

      <h2 className="mb-2 text-sm font-semibold text-slate-500">
        Empleados ({employees.length})
      </h2>
      <EmployeeList employees={employees} hrefBase="/estudio/empleados" />
    </>
  );
}
