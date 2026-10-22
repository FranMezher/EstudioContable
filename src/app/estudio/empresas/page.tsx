import Link from "next/link";
import { Building2, Search } from "lucide-react";
import { requireStudio } from "@/lib/session";
import { getCompanies, getDashboardStats, getPeriodCoverage } from "@/server/queries";
import { MESES, formatCuil } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { NewCompanyForm } from "@/components/forms/new-company-form";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/field";

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { scope } = await requireStudio();
  const { q } = await searchParams;
  const [companies, stats] = await Promise.all([getCompanies(scope, q), getDashboardStats(scope)]);

  const period =
    stats.lastPeriod?.periodYear && stats.lastPeriod?.periodMonth
      ? { periodYear: stats.lastPeriod.periodYear, periodMonth: stats.lastPeriod.periodMonth }
      : null;
  const coverage = new Map(
    (period ? await getPeriodCoverage(scope, period) : []).map((c) => [c.id, c])
  );
  const mes = period ? MESES[period.periodMonth - 1] : null;

  return (
    <>
      <PageHeader
        title="Empresas"
        description={
          mes
            ? `Las ${stats.companies} empresas del estudio y cómo vienen con los recibos de ${mes.toLowerCase()}.`
            : "Las empresas del estudio y sus recibos."
        }
        action={<NewCompanyForm />}
      />

      <form className="mb-5" role="search">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <Input
            name="q"
            type="search"
            aria-label="Buscar por nombre o CUIT"
            defaultValue={q ?? ""}
            placeholder="Buscar por nombre o CUIT"
            className="pl-9"
          />
        </div>
      </form>

      {companies.length === 0 ? (
        <EmptyState
          title={q ? "Sin resultados" : "Todavía no hay empresas"}
          description={q ? "Probá con otro nombre o CUIT." : "Creá la primera empresa para empezar a cargar recibos."}
          icon={Building2}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-ink-200 bg-white">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-ink-50 text-left text-[13px] text-ink-500">
                <th className="px-6 py-3 font-medium">Empresa</th>
                <th className="px-3 py-3 font-medium">CUIT</th>
                <th className="px-3 py-3 text-right font-medium">Empleados</th>
                <th className="w-56 px-3 py-3 font-medium">{mes ?? "Recibos"}</th>
                <th className="px-6 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => {
                const cov = coverage.get(c.id);
                const total = cov?.activeEmployees ?? c.employeeCount;
                const done = cov?.withPayslip ?? 0;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                const completa = total > 0 && done === total;
                return (
                  <tr key={c.id} className="border-t border-ink-100">
                    <td className="px-6 py-3.5">
                      <Link
                        href={`/estudio/empresas/${c.id}`}
                        className="font-semibold text-ink-900 hover:text-brand-700 hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="tnum px-3 py-3.5 text-ink-500">{c.cuit ? formatCuil(c.cuit) : "—"}</td>
                    <td className="tnum px-3 py-3.5 text-right">{total}</td>
                    <td className="px-3 py-3.5">
                      {mes ? (
                        <div className="flex items-center gap-2.5">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-200">
                            <div
                              className={completa ? "h-full bg-brand-700" : "h-full bg-accent-500"}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="tnum min-w-14 text-right text-[13px] text-ink-700">
                            {done} de {total}
                          </span>
                        </div>
                      ) : (
                        <span className="tnum text-ink-700">{c.payslipCount}</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      {total === 0 ? (
                        <Badge>Sin empleados</Badge>
                      ) : !mes || done === 0 ? (
                        <Badge>Sin recibos</Badge>
                      ) : completa ? (
                        <Badge tone="brand">Completa</Badge>
                      ) : (
                        <Badge tone="warning">Faltan {total - done}</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
