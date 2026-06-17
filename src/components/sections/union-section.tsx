"use client";

import { useState, useEffect, useActionState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Download, Trash2, Landmark, X, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { PeriodFields } from "@/components/period-fields";
import { periodoLabel } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/utils";
import { createUnionItem, toggleUnionPaid, deleteUnionItem, type ActionState } from "@/server/actions";
import type { UnionDTO } from "@/server/queries";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Cargar sindicato"}
    </Button>
  );
}

export function UnionSection({
  clientId,
  items,
  canManage = true,
}: {
  clientId?: string;
  items: UnionDTO[];
  canManage?: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(createUnionItem, {});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (state.ok) setShowForm(false);
  }, [state.ok]);

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            El estudio carga los aportes y el cliente marca <strong>OK</strong> al pagar.
          </p>
          {canManage && (
            <Button size="sm" variant={showForm ? "secondary" : "primary"} onClick={() => setShowForm((v) => !v)}>
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? "Cancelar" : "Cargar"}
            </Button>
          )}
        </div>

        {showForm && canManage && (
          <form action={formAction} className="mb-5 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            {clientId && <input type="hidden" name="clientId" value={clientId} />}
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <div>
              <Label htmlFor="title">Título</Label>
              <Input id="title" name="title" placeholder="Ej: Sindicato de Comercio - Aporte" required />
            </div>
            <PeriodFields />
            <div>
              <Label htmlFor="amount">Importe (opcional)</Label>
              <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" />
            </div>
            <div>
              <Label htmlFor="description">Detalle (opcional)</Label>
              <Textarea id="description" name="description" className="min-h-16" />
            </div>
            <div>
              <Label htmlFor="file">Archivo adjunto (opcional)</Label>
              <Input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" />
            </div>
            <SubmitBtn />
          </form>
        )}

        {items.length === 0 ? (
          <EmptyState title="Sin sindicatos" description="Todavía no hay aportes cargados." icon={Landmark} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{u.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {periodoLabel(u.periodMonth, u.periodYear)}
                      {u.amount != null && ` · ${formatMoney(u.amount)}`}
                      {u.description && ` · ${u.description}`}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {u.isPaid ? (
                    <Badge tone="success">
                      <Check className="h-3 w-3" /> Pagado
                    </Badge>
                  ) : (
                    <Badge tone="warning">Pendiente</Badge>
                  )}

                  {u.fileUrl && (
                    <a href={u.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="icon" variant="outline" title="Ver adjunto">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                  )}

                  <Button
                    size="sm"
                    variant={u.isPaid ? "outline" : "success"}
                    disabled={isPending}
                    onClick={() => startTransition(() => toggleUnionPaid(u.id, !u.isPaid))}
                  >
                    {u.isPaid ? "Desmarcar" : "Marcar OK"}
                  </Button>

                  {canManage && (
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Eliminar"
                      disabled={isPending}
                      onClick={() => {
                        if (confirm("¿Eliminar este aporte?"))
                          startTransition(() => deleteUnionItem(u.id));
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
