import Link from "next/link";
import { Building2, ChevronRight, Search } from "lucide-react";
import { requireStudio } from "@/lib/session";
import { getCompanies } from "@/server/queries";
import { formatCuil } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { NewCompanyForm } from "@/components/forms/new-company-form";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { scope } = await requireStudio();
  const { q } = await searchParams;
  const companies = await getCompanies(scope, q);

  return (
    <>
      <PageHeader
        title="Empresas"
        description="Las empresas del estudio y sus recibos."
        action={<NewCompanyForm />}
      />

      <form className="mb-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nombre o CUIT…"
            className="pl-9"
          />
        </div>
      </form>

      {companies.length === 0 ? (
        <EmptyState
          title={q ? "Sin resultados" : "Todavía no hay empresas"}
          description={q ? "Probá con otro nombre o CUIT." : "Creá la primera empresa."}
          icon={Building2}
        />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {companies.map((c) => (
            <li key={c.id}>
              <Link
                href={`/estudio/empresas/${c.id}`}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 font-semibold text-brand-700">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{c.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {c.cuit ? `${formatCuil(c.cuit)} · ` : ""}
                    {c.employeeCount} empleado(s) · {c.payslipCount} recibo(s)
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
