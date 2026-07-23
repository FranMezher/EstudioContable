import { Receipt, Search, Users } from "lucide-react";
import { requireCompanyAdmin } from "@/lib/session";
import { getDashboardStats, getEmployees } from "@/server/queries";
import { periodoLabel } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmployeeList } from "@/components/employee-list";
import { NewEmployeeForm } from "@/components/forms/new-employee-form";
import { Input } from "@/components/ui/field";

export default async function EmpresaHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { scope } = await requireCompanyAdmin();
  const { q } = await searchParams;

  // El alcance ya limita a la propia empresa: no hace falta pasar companyId.
  const [stats, employees] = await Promise.all([
    getDashboardStats(scope),
    getEmployees(scope, { search: q }),
  ]);

  return (
    <>
      <PageHeader
        title="Empleados"
        description="Los empleados de tu empresa y sus recibos."
        action={<NewEmployeeForm />}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <StatCard label="Empleados activos" value={stats.employees} icon={Users} />
        <StatCard
          label="Recibos cargados"
          value={stats.payslips}
          hint={
            stats.lastPeriod
              ? `Último: ${periodoLabel(stats.lastPeriod.periodMonth, stats.lastPeriod.periodYear)}`
              : undefined
          }
          icon={Receipt}
        />
      </div>

      <form className="mb-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nombre o CUIL…"
            className="pl-9"
          />
        </div>
      </form>

      <EmployeeList employees={employees} hrefBase="/empresa/empleados" />
    </>
  );
}
