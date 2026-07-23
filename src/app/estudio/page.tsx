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

  const pendientes = review.autoEmployees.length + review.pendingItems.length;
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
        <StatCard label="Pendientes de revisión" value={pendientes} icon={AlertTriangle} />
      </div>

      {pendientes > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50/50">
          <CardHeader className="border-amber-100">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Hay {pendientes} cosa{pendientes === 1 ? "" : "s"} para revisar
            </CardTitle>
            <Link
              href="/estudio/importaciones"
              className="text-sm font-medium text-amber-800 underline underline-offset-2"
            >
              Ver detalle
            </Link>
          </CardHeader>
          <CardContent className="text-sm text-amber-900">
            {review.autoEmployees.length > 0 && (
              <p>
                {review.autoEmployees.length} empleado(s) creados automáticamente por el importador,
                sin confirmar.
              </p>
            )}
            {review.pendingItems.length > 0 && (
              <p>{review.pendingItems.length} archivo(s) que el importador no pudo asignar.</p>
            )}
          </CardContent>
        </Card>
      )}

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
                <p className="mb-3 text-sm text-slate-500">
                  {sinRecibos.length} empresa(s) todavía sin ningún recibo cargado.
                </p>
              )}
              <ul className="divide-y divide-slate-100">
                {companies.slice(0, 8).map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/estudio/empresas/${c.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{c.name}</p>
                        <p className="text-xs text-slate-500">
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
