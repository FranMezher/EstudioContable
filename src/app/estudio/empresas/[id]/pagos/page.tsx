import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireStudio } from "@/lib/session";
import { getCompany } from "@/server/queries";
import { buildPaymentsView } from "@/server/payments-view";
import { ServiceError } from "@/server/scope";
import { PageHeader } from "@/components/page-header";
import { PaymentsTable } from "@/components/payments-table";

export default async function PagosEstudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string; months?: string }>;
}) {
  const { scope } = await requireStudio();
  const { id } = await params;
  const sp = await searchParams;

  const company = await getCompany(scope, id).catch((e) => {
    if (e instanceof ServiceError && e.status === 404) notFound();
    throw e;
  });
  const view = await buildPaymentsView(scope, sp, company.id);

  return (
    <>
      <Link
        href={`/estudio/empresas/${company.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> {company.name}
      </Link>

      <PageHeader
        title={`Pagos · ${company.name}`}
        description="Cuánto pagarle a cada empleado según su recibo. Marcá los que ya pagaste y descargá todos los recibos juntos."
      />
      <PaymentsTable
        data={view.data}
        years={view.years}
        year={view.year}
        selectedMonths={view.months}
        zipHref={view.zipHref}
        companyId={company.id}
      />
    </>
  );
}
