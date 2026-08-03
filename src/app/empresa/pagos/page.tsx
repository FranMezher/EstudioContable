import { requireCompanyAdmin } from "@/lib/session";
import { buildPaymentsView } from "@/server/payments-view";
import { PageHeader } from "@/components/page-header";
import { PaymentsTable } from "@/components/payments-table";

export default async function PagosEmpresaPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; months?: string }>;
}) {
  const { scope } = await requireCompanyAdmin();
  const sp = await searchParams;
  const view = await buildPaymentsView(scope, sp);

  return (
    <>
      <PageHeader
        title="Pagos"
        description="Cuánto pagarle a cada empleado según su recibo. Marcá los que ya pagaste y descargá todos los recibos juntos."
      />
      <PaymentsTable
        data={view.data}
        years={view.years}
        year={view.year}
        selectedMonths={view.months}
        zipHref={view.zipHref}
      />
    </>
  );
}
