import { CheckCircle2, Download, Eye, Receipt } from "lucide-react";
import { periodoLabel } from "@/lib/constants";
import { formatMoney, formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { SignPayslipButton } from "@/components/forms/sign-payslip-button";
import type { PayslipDTO } from "@/server/queries";

/**
 * Lista de recibos pensada para el celular: filas altas, dos acciones claras
 * y nada que se pueda tocar por error. Los links apuntan a la ruta
 * autenticada, nunca al archivo directo.
 */
export function PayslipList({
  payslips,
  actions,
  canSign = false,
}: {
  payslips: PayslipDTO[];
  /** Acciones extra por recibo (ej: eliminar, solo para admins). */
  actions?: (payslip: PayslipDTO) => React.ReactNode;
  /** Muestra el botón "Firmar" (solo en la vista del propio empleado). */
  canSign?: boolean;
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
    <ul className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-[var(--shadow-card)]">
      {payslips.map((p) => {
        const periodo =
          periodoLabel(p.periodMonth, p.periodYear) +
          (p.label ? ` · ${p.label}` : p.liqNumber ? ` · Liq. ${p.liqNumber}` : "");
        return (
          <li
            key={p.id}
            className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-ink-50/70"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <Receipt className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-ink-800">{periodo}</p>
                {p.signed ? (
                  <Badge tone="success">
                    <CheckCircle2 className="h-3 w-3" /> Firmado
                    {p.signedAt ? ` · ${formatDate(p.signedAt)}` : ""}
                  </Badge>
                ) : (
                  <Badge tone="warning">Sin firmar</Badge>
                )}
              </div>
              <p className="tnum text-xs text-ink-500">
                {p.netAmount != null ? `Neto: ${formatMoney(p.netAmount)}` : "Recibo de sueldo"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/api/files/payslip/${p.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-ink-300 bg-white px-3.5 text-sm font-medium text-ink-700 shadow-xs transition-colors hover:bg-ink-50 hover:border-ink-400"
              >
                <Eye className="h-4 w-4" />
                Ver
              </a>
              <a
                href={`/api/files/payslip/${p.id}?download=1`}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-700 px-3.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-800"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Descargar</span>
              </a>
              {canSign && !p.signed && <SignPayslipButton payslipId={p.id} periodo={periodo} />}
              {actions?.(p)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
