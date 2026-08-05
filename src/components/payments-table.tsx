"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Download, Eye, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MESES, periodoCorto } from "@/lib/constants";
import { formatMoney, cn } from "@/lib/utils";
import { setPayslipPaid } from "@/server/actions";
import type { PaymentRow } from "@/server/queries";

/** Etiqueta y color del concepto. Sin label = sueldo mensual (neutro). */
function conceptoBadge(label: string | null): { text: string; tone: "neutral" | "brand" | "accent" | "warning" } {
  if (!label) return { text: "Sueldo", tone: "neutral" };
  const l = label.toLowerCase();
  if (l.includes("vacacion")) return { text: label, tone: "brand" };
  if (l.includes("sac") || l.includes("aguinaldo")) return { text: label, tone: "accent" };
  if (l.includes("final")) return { text: label, tone: "warning" };
  return { text: label, tone: "brand" };
}

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
  excelHref,
  companyId,
}: {
  data: Summary;
  years: number[];
  year: number;
  /** Meses activos; vacío = todos. */
  selectedMonths: number[];
  zipHref: string;
  excelHref: string;
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
            <label className="text-[13px] font-medium text-ink-600">Año</label>
            <select
              value={year}
              onChange={(e) => updateFilter({ year: Number(e.target.value) })}
              className="tnum h-9 rounded-lg border border-ink-300 bg-white px-3 text-sm text-ink-800 shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
            >
              {(years.length ? years : [year]).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <button
              onClick={() => updateFilter({ months: [] })}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                selectedMonths.length === 0
                  ? "bg-brand-700 text-white shadow-sm"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200"
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
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "bg-brand-600 text-white shadow-sm"
                      : "bg-ink-100 text-ink-600 hover:bg-ink-200"
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
        <div className="tnum flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <span className="text-ink-600">
            {data.count} recibo(s) · <strong className="font-semibold text-ink-800">{data.pendientes}</strong> sin pagar
          </span>
          <span className="text-ink-600">
            Total a pagar: <strong className="font-semibold text-ink-800">{formatMoney(data.total)}</strong>
          </span>
          {data.totalPagado > 0 && (
            <span className="font-medium text-emerald-700">Pagado: {formatMoney(data.totalPagado)}</span>
          )}
        </div>

        {data.count > 0 && (
          <div className="flex flex-wrap gap-2">
            <a href={excelHref}>
              <Button variant="outline">
                <FileDown className="h-4 w-4" />
                Descargar Excel
              </Button>
            </a>
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
                Recibos (ZIP)
              </Button>
            </a>
          </div>
        )}
      </div>

      {/* Tabla */}
      {data.count === 0 ? (
        <EmptyState
          title="Sin recibos en este período"
          description="Probá con otro mes o cargá los recibos."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 bg-ink-50/60 text-left text-[11px] uppercase tracking-wider text-ink-500">
                  <th className="px-4 py-3 font-semibold">Pagado</th>
                  <th className="px-4 py-3 font-semibold">Empleado</th>
                  <th className="px-4 py-3 font-semibold">Concepto</th>
                  <th className="px-4 py-3 font-semibold">Período</th>
                  <th className="px-4 py-3 font-semibold">Liq.</th>
                  <th className="px-4 py-3 text-right font-semibold">Monto</th>
                  <th className="px-4 py-3 text-right font-semibold">Recibo</th>
                </tr>
              </thead>
              <tbody>
                {groupRows(data.items).map(({ row, first, band }) => (
                  <PaymentRowItem key={row.id} row={row} first={first} band={band} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/**
 * Marca la primera fila de cada empleado (para mostrar el nombre una sola vez)
 * y alterna una banda por empleado, para que se lean como un bloque y no como
 * filas repetidas. Depende de que vengan ordenadas por empleado.
 */
function groupRows(items: PaymentRow[]): { row: PaymentRow; first: boolean; band: boolean }[] {
  let prev: string | null = null;
  let groupIndex = -1;
  return items.map((row) => {
    const first = row.employeeId !== prev;
    if (first) groupIndex++;
    prev = row.employeeId;
    return { row, first, band: groupIndex % 2 === 1 };
  });
}

function PaymentRowItem({ row, first, band }: { row: PaymentRow; first: boolean; band: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [paid, setPaid] = useState(row.paid);
  const concepto = conceptoBadge(row.label);

  function toggle() {
    const next = !paid;
    setPaid(next); // optimista
    startTransition(async () => {
      const res = await setPayslipPaid(row.id, next);
      if (res.error) setPaid(!next); // revertir si falló
    });
  }

  return (
    <tr
      className={cn(
        "border-t transition-colors",
        first ? "border-ink-200" : "border-ink-100/70",
        paid
          ? "bg-emerald-50/60 hover:bg-emerald-50"
          : cn(band ? "bg-ink-50/50" : "bg-white", "hover:bg-ink-50/80")
      )}
    >
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={paid}
          disabled={isPending}
          onChange={toggle}
          className="h-5 w-5 cursor-pointer rounded border-ink-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500/30"
          aria-label={`Marcar ${row.employeeName} como pagado`}
        />
      </td>
      <td className="px-4 py-3">
        {first ? (
          <>
            <p className="font-medium text-ink-800">{row.employeeName}</p>
            {row.legajo && <p className="tnum text-xs text-ink-500">Leg. {row.legajo}</p>}
          </>
        ) : (
          <span className="pl-1 text-ink-300" aria-hidden>
            ↳
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge tone={concepto.tone}>{concepto.text}</Badge>
      </td>
      <td className="px-4 py-3 text-ink-600">{periodoCorto(row.periodMonth, row.periodYear)}</td>
      <td className="tnum px-4 py-3 text-ink-500">{row.liqNumber ?? "—"}</td>
      <td className="tnum px-4 py-3 text-right font-semibold text-ink-800">
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
