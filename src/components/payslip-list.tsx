import { Download, Eye, Receipt } from "lucide-react";
import { periodoLabel } from "@/lib/constants";
import { formatMoney } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import type { PayslipDTO } from "@/server/queries";

/**
 * Lista de recibos pensada para el celular: filas altas, dos acciones claras
 * y nada que se pueda tocar por error. Los links apuntan a la ruta
 * autenticada, nunca al archivo directo.
 */
export function PayslipList({
  payslips,
  actions,
}: {
  payslips: PayslipDTO[];
  /** Acciones extra por recibo (ej: eliminar, solo para admins). */
  actions?: (payslip: PayslipDTO) => React.ReactNode;
}) {
  if (payslips.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay recibos"
        description="Cuando el estudio cargue un recibo, va a aparecer acá."
        icon={Receipt}
      />
    );
  }

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {payslips.map((p) => (
        <li
          key={p.id}
          className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50/70"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Receipt className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">
              {periodoLabel(p.periodMonth, p.periodYear)}
              {p.label ? ` · ${p.label}` : p.liqNumber ? ` · Liq. ${p.liqNumber}` : ""}
            </p>
            <p className="text-xs text-slate-500">
              {p.netAmount != null ? `Neto: ${formatMoney(p.netAmount)}` : "Recibo de sueldo"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/api/files/payslip/${p.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Eye className="h-4 w-4" />
              Ver
            </a>
            <a
              href={`/api/files/payslip/${p.id}?download=1`}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-700 px-3.5 text-sm font-medium text-white hover:bg-brand-800"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Descargar</span>
            </a>
            {actions?.(p)}
          </div>
        </li>
      ))}
    </ul>
  );
}
