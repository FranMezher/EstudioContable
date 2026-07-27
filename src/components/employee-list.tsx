import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { formatCuil, periodoCorto } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { EmployeeDTO } from "@/server/queries";

export function EmployeeList({
  employees,
  hrefBase,
}: {
  employees: EmployeeDTO[];
  /** Ej: "/estudio/empleados" o "/empresa/empleados". */
  hrefBase: string;
}) {
  if (employees.length === 0) {
    return (
      <EmptyState
        title="Sin empleados"
        description="Agregá empleados para poder cargarles recibos."
        icon={Users}
      />
    );
  }

  return (
    <ul className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-[var(--shadow-card)]">
      {employees.map((e) => (
        <li key={e.id}>
          <Link
            href={`${hrefBase}/${e.id}`}
            className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-ink-50/70"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-100 text-sm font-semibold text-ink-600 ring-1 ring-ink-200">
              {e.name.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-800">{e.name}</p>
              <p className="tnum truncate text-xs text-ink-500">
                {formatCuil(e.cuil)}
                {e.position ? ` · ${e.position}` : ""} · {e.payslipCount} recibo(s)
                {e.lastPeriod ? ` · último ${periodoCorto(e.lastPeriod.month, e.lastPeriod.year)}` : ""}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {e.autoCreated && <Badge tone="warning">Revisar</Badge>}
              {!e.hasAccess && <Badge tone="neutral">Sin acceso</Badge>}
              {!e.isActive && <Badge tone="danger">Inactivo</Badge>}
              <ChevronRight className="h-4 w-4 text-ink-400" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
