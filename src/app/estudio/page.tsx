import Link from "next/link";
import { AlertTriangle, Building2, Receipt, Users } from "lucide-react";
import { requireStudio } from "@/lib/session";
import { getDashboardStats, getPendingReview, getCompanies } from "@/server/queries";
import { periodoLabel } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function EstudioHome() {
  const { scope } = await requireStudio();
  const [stats, review, companies] = await Promise.all([
    getDashboardStats(scope),
    getPendingReview(scope),
    getCompanies(scope),
  ]);

  const pendientes = review.total;
  const sinRecibos = companies.filter((c) => c.payslipCount === 0);

  return (
    <>
      <PageHeader
        title="Inicio"
        description="Resumen de empresas, empleados y recibos cargados."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Empresas" value={stats.companies} icon={Building2} />
        <StatCard label="Empleados activos" value={stats.employees} icon={Users} />
        <StatCard
          label="Recibos"
          value={stats.payslips}
          hint={
            stats.lastPeriod
              ? `Último: ${periodoLabel(stats.lastPeriod.periodMonth, stats.lastPeriod.periodYear)}`
              : undefined
          }
          icon={Receipt}
        />
        {pendientes > 0 ? (
          <Link
            href="/estudio/importaciones"
            className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <StatCard
              label="Pendientes de revisión"
              value={pendientes}
              hint="Tocá para revisar y descartar"
              icon={AlertTriangle}
            />
          </Link>
        ) : (
          <StatCard label="Pendientes de revisión" value={pendientes} icon={AlertTriangle} />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Empresas</CardTitle>
          <Link
            href="/estudio/empresas"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Ver todas
          </Link>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <EmptyState
              title="Todavía no hay empresas"
              description="Creá la primera empresa para empezar a cargar recibos."
              icon={Building2}
            />
          ) : (
            <>
              {sinRecibos.length > 0 && (
                <p className="mb-3 text-sm text-ink-500">
                  {sinRecibos.length} empresa(s) todavía sin ningún recibo cargado.
                </p>
              )}
              <ul className="divide-y divide-ink-100">
                {companies.slice(0, 8).map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/estudio/empresas/${c.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-800">{c.name}</p>
                        <p className="text-xs text-ink-500">
                          {c.employeeCount} empleado(s) · {c.payslipCount} recibo(s)
                        </p>
                      </div>
                      {c.payslipCount === 0 && <Badge tone="warning">Sin recibos</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
