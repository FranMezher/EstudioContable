"use client";

import { useState, useEffect, useActionState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Download, Trash2, FileText, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { PeriodFields } from "@/components/period-fields";
import { DECLARATION_TYPES, periodoLabel } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { uploadDeclaration, deleteDeclaration, type ActionState } from "@/server/actions";
import type { DeclarationDTO } from "@/server/queries";
import type { DeclarationType } from "@/generated/prisma/enums";

const TYPES = Object.keys(DECLARATION_TYPES) as DeclarationType[];

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Subiendo…" : "Subir declaración"}
    </Button>
  );
}

export function DeclarationsSection({
  clientId,
  declarations,
  canManage = true,
}: {
  clientId?: string;
  declarations: DeclarationDTO[];
  canManage?: boolean;
}) {
  const [active, setActive] = useState<DeclarationType>("IVA");
  const [showForm, setShowForm] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(uploadDeclaration, {});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (state.ok) setShowForm(false);
  }, [state.ok]);

  const filtered = declarations.filter((d) => d.type === active);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              active === t
                ? "bg-brand-700 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {DECLARATION_TYPES[t].label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">{DECLARATION_TYPES[active].label}</h3>
              <p className="text-sm text-slate-500">{DECLARATION_TYPES[active].description}</p>
            </div>
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
              <input type="hidden" name="type" value={active} />
              {state.error && <p className="text-sm text-red-600">{state.error}</p>}
              <PeriodFields includeMonth={DECLARATION_TYPES[active].periodic} />
              <div>
                <Label htmlFor="file">Archivo (PDF)</Label>
                <Input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required />
              </div>
              <div>
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea id="notes" name="notes" placeholder="Aclaraciones…" className="min-h-16" />
              </div>
              <SubmitBtn />
            </form>
          )}

          {filtered.length === 0 ? (
            <EmptyState title="Sin declaraciones" description="Todavía no hay documentos cargados en esta sección." icon={FileText} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {periodoLabel(d.periodMonth, d.periodYear)}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {d.fileName} · {formatDate(d.createdAt)}
                        {d.uploadedRole === "CLIENT" && " · subido por el cliente"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <a href={d.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4" /> Ver
                      </Button>
                    </a>
                    {canManage && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Eliminar"
                        disabled={isPending}
                        onClick={() => {
                          if (confirm("¿Eliminar esta declaración?"))
                            startTransition(() => deleteDeclaration(d.id));
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
    </div>
  );
}
