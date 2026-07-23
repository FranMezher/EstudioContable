"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Download, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MESES, periodoCorto } from "@/lib/constants";
import { formatMoney } from "@/lib/utils";
import { setPayslipPaid } from "@/server/actions";
import type { PaymentRow } from "@/server/queries";

type Summary = {
  items: PaymentRow[];
  total: number;
  totalPagado: number;
  totalPendiente: number;
  count: number;
  pendientes: number;
};

/**
 * Tabla de pagos: por cada recibo, cuánto hay que pagarle al empleado y un
 * check para marcar si ya se pagó. Arriba, filtro de período y descarga de
 * todos los recibos del filtro en un ZIP.
 */
export function PaymentsTable({
  data,
  years,
  year,
  selectedMonths,
  zipHref,
  companyId,
}: {
  data: Summary;
  years: number[];
  year: number;
  /** Meses activos; vacío = todos. */
  selectedMonths: number[];
  zipHref: string;
  companyId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [downloading, setDownloading] = useState(false);

  function updateFilter(next: { year?: number; months?: number[] }) {
    const params = new URLSearchParams();
    if (companyId) params.set("companyId", companyId);
    params.set("year", String(next.year ?? year));
    const months = next.months ?? selectedMonths;
    if (months.length > 0) params.set("months", months.join(","));
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleMonth(m: number) {
    const set = new Set(selectedMonths);
    if (set.has(m)) set.delete(m);
    else set.add(m);
    updateFilter({ months: [...set].sort((a, b) => a - b) });
  }

  return (
    <div className="space-y-4">
      {/* Filtro */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-slate-600">Año</label>
            <select
              value={year}
              onChange={(e) => updateFilter({ year: Number(e.target.value) })}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
            >
              {(years.length ? years : [year]).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <button
              onClick={() => updateFilter({ months: [] })}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                selectedMonths.length === 0
                  ? "bg-brand-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Todos
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {MESES.map((m, i) => {
              const mes = i + 1;
              const active = selectedMonths.includes(mes);
              return (
                <button
                  key={m}
                  onClick={() => toggleMonth(mes)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    active
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Resumen + descarga */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-slate-600">
            {data.count} recibo(s) · <strong className="text-slate-800">{data.pendientes}</strong> sin pagar
          </span>
          <span className="text-slate-600">
            Total a pagar: <strong className="text-slate-800">{formatMoney(data.total)}</strong>
          </span>
          {data.totalPagado > 0 && (
            <span className="text-emerald-700">Pagado: {formatMoney(data.totalPagado)}</span>
          )}
        </div>

        {data.count > 0 && (
          <a
            href={zipHref}
            onClick={() => {
              setDownloading(true);
              // El navegador dispara la descarga; liberamos el botón enseguida.
              setTimeout(() => setDownloading(false), 4000);
            }}
          >
            <Button disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Descargar todos (ZIP)
            </Button>
          </a>
        )}
      </div>

      {/* Tabla */}
      {data.count === 0 ? (
        <EmptyState
          title="Sin recibos en este período"
          description="Probá con otro mes o cargá los recibos."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Pagado</th>
                  <th className="px-4 py-3 font-medium">Empleado</th>
                  <th className="px-4 py-3 font-medium">Período</th>
                  <th className="px-4 py-3 text-right font-medium">Monto</th>
                  <th className="px-4 py-3 text-right font-medium">Recibo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.items.map((row) => (
                  <PaymentRowItem key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function PaymentRowItem({ row }: { row: PaymentRow }) {
  const [isPending, startTransition] = useTransition();
  const [paid, setPaid] = useState(row.paid);

  function toggle() {
    const next = !paid;
    setPaid(next); // optimista
    startTransition(async () => {
      const res = await setPayslipPaid(row.id, next);
      if (res.error) setPaid(!next); // revertir si falló
    });
  }

  return (
    <tr className={paid ? "bg-emerald-50/40" : ""}>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={paid}
          disabled={isPending}
          onChange={toggle}
          className="h-5 w-5 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          aria-label={`Marcar ${row.employeeName} como pagado`}
        />
      </td>
      <td className="px-4 py-3">
        <p className="font-medium text-slate-800">{row.employeeName}</p>
        <p className="text-xs text-slate-500">
          {row.legajo ? `Leg. ${row.legajo}` : ""}
          {row.liqNumber ? `${row.legajo ? " · " : ""}Liq. ${row.liqNumber}` : ""}
        </p>
      </td>
      <td className="px-4 py-3 text-slate-600">{periodoCorto(row.periodMonth, row.periodYear)}</td>
      <td className="px-4 py-3 text-right font-semibold text-slate-800">
        {row.netAmount != null ? formatMoney(row.netAmount) : "—"}
      </td>
      <td className="px-4 py-3 text-right">
        <a href={`/api/files/payslip/${row.id}`} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4" /> Ver
          </Button>
        </a>
      </td>
    </tr>
  );
}
