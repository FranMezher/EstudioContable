import { getAvailableYears, getPaymentRows } from "@/server/queries";
import type { Scope } from "@/server/scope";

/** Prepara todo lo que necesita la pantalla de pagos a partir de los params. */
export async function buildPaymentsView(
  scope: Scope,
  searchParams: { year?: string; months?: string },
  companyId?: string
) {
  const years = await getAvailableYears(scope, companyId);
  const currentYear = new Date().getFullYear();
  const year = searchParams.year ? Number(searchParams.year) : years[0] ?? currentYear;

  const months = (searchParams.months ?? "")
    .split(",")
    .map((m) => Number(m))
    .filter((m) => m >= 1 && m <= 12);

  const data = await getPaymentRows(scope, { companyId, year, months });

  const params = new URLSearchParams();
  if (companyId) params.set("companyId", companyId);
  params.set("year", String(year));
  if (months.length) params.set("months", months.join(","));
  const zipHref = `/api/files/payslips-zip?${params.toString()}`;

  return { years, year, months, data, zipHref };
}
