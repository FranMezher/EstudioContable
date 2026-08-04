"use client";

import { useMemo, useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  ChevronRight,
  Copy,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCuil, periodoLabel } from "@/lib/constants";
import { resolvePendingItems } from "@/server/actions";
import type { PendingItemDTO } from "@/server/queries";

type Tone = "neutral" | "warning" | "danger";
type Meta = { label: string; help: string; icon: LucideIcon; tone: Tone };

/** Cada tipo de problema con su explicación de qué hacer. */
const META: Record<string, Meta> = {
  SIN_EMPRESA: {
    label: "Falta dar de alta la empresa",
    help: "Creá la empresa (con su CUIT) y volvé a correr el importador.",
    icon: Building2,
    tone: "danger",
  },
  SIN_EMPLEADO: {
    label: "Falta dar de alta el empleado",
    help: "Cargá el empleado en su empresa (con su CUIL) y volvé a importar.",
    icon: Users,
    tone: "danger",
  },
  SIN_PERIODO: {
    label: "No se pudo leer el período",
    help: "Suele pasar con PDFs escaneados sin texto. Se puede cargar a mano.",
    icon: AlertCircle,
    tone: "warning",
  },
  ERROR: {
    label: "Otro error",
    help: "Mirá el detalle de cada archivo.",
    icon: AlertTriangle,
    tone: "danger",
  },
  DUPLICADO: {
    label: "Ya estaban cargados",
    help: "No hay nada que hacer: ya estaban en el sistema. Se pueden descartar.",
    icon: Copy,
    tone: "neutral",
  },
};

const ORDER = ["SIN_EMPRESA", "SIN_EMPLEADO", "SIN_PERIODO", "ERROR", "DUPLICADO"];

const CHIP: Record<Tone, string> = {
  danger: "bg-red-50 text-red-600 ring-red-100",
  warning: "bg-amber-50 text-amber-600 ring-amber-100",
  neutral: "bg-ink-100 text-ink-500 ring-ink-200",
};

function metaOf(status: string): Meta {
  return META[status] ?? { label: status, help: "", icon: AlertTriangle, tone: "danger" };
}

/**
 * Lista de archivos "sin asignar", agrupados por tipo de problema. Cada grupo
 * se puede desplegar y descartar entero, o descartar archivo por archivo.
 * Descartar no borra el recibo: solo saca el ítem de esta lista (marca revisado).
 */
export function PendingReview({ items }: { items: PendingItemDTO[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const visibles = useMemo(() => items.filter((i) => !hidden.has(i.id)), [items, hidden]);

  const grupos = useMemo(() => {
    const map = new Map<string, PendingItemDTO[]>();
    for (const it of visibles) {
      const arr = map.get(it.status) ?? [];
      arr.push(it);
      map.set(it.status, arr);
    }
    return [...map.entries()].sort((a, b) => {
      const ia = ORDER.indexOf(a[0]);
      const ib = ORDER.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }, [visibles]);

  if (visibles.length === 0) return null;

  function dismiss(filter: { ids?: string[]; status?: string; all?: boolean }, ids: string[]) {
    setError(undefined);
    // Optimista: se ocultan al instante; si el server falla, se revierten.
    setHidden((prev) => new Set([...prev, ...ids]));
    startTransition(async () => {
      const res = await resolvePendingItems(filter);
      if (res.error) {
        setError(res.error);
        setHidden((prev) => {
          const n = new Set(prev);
          ids.forEach((id) => n.delete(id));
          return n;
        });
      }
    });
  }

  const toggle = (status: string) =>
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(status)) n.delete(status);
      else n.add(status);
      return n;
    });

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50/60 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h2 className="text-sm font-semibold text-amber-900">
              Archivos sin asignar ({visibles.length})
            </h2>
            <p className="text-xs text-amber-700/80">
              Agrupados por motivo. Resolvé el alta o descartalos.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => {
            if (
              !confirm(
                `¿Descartar los ${visibles.length} archivos sin asignar? No se borran recibos, solo salen de esta lista.`
              )
            )
              return;
            dismiss(
              { all: true },
              visibles.map((i) => i.id)
            );
          }}
        >
          <X className="h-4 w-4" /> Descartar todos
        </Button>
      </div>

      {error && <p className="px-5 pt-3 text-sm text-red-600">{error}</p>}

      <ul className="divide-y divide-ink-100">
        {grupos.map(([status, lista]) => {
          const m = metaOf(status);
          const Icon = m.icon;
          const abierto = open.has(status);
          return (
            <li key={status}>
              <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <button
                  onClick={() => toggle(status)}
                  aria-expanded={abierto}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 text-ink-400 transition-transform",
                      abierto && "rotate-90"
                    )}
                  />
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                      CHIP[m.tone]
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink-800">
                      {m.label}
                    </span>
                    {m.help && <span className="block truncate text-xs text-ink-500">{m.help}</span>}
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={m.tone}>{lista.length}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => {
                      if (!confirm(`¿Descartar los ${lista.length} de "${m.label}"?`)) return;
                      dismiss(
                        { status },
                        lista.map((i) => i.id)
                      );
                    }}
                  >
                    <X className="h-4 w-4" /> Descartar
                  </Button>
                </div>
              </div>

              {abierto && (
                <ul className="divide-y divide-ink-100/70 border-t border-ink-100 bg-ink-50/40">
                  {lista.map((i) => {
                    const detalle = [
                      i.detectedCompany ? `Empresa ${i.detectedCompany}` : null,
                      i.detectedLegajo ? `Legajo ${i.detectedLegajo}` : null,
                      i.detectedCuil ? `CUIL ${formatCuil(i.detectedCuil)}` : null,
                      i.periodYear ? periodoLabel(i.periodMonth, i.periodYear) : null,
                      i.message,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <li key={i.id} className="flex items-center gap-3 py-2.5 pl-14 pr-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-ink-800">{i.fileName}</p>
                          {detalle && <p className="truncate text-xs text-ink-500">{detalle}</p>}
                        </div>
                        <button
                          title="Descartar este archivo"
                          disabled={isPending}
                          onClick={() => dismiss({ ids: [i.id] }, [i.id])}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
