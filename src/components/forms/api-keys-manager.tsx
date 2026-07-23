"use client";

import { useActionState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Copy, KeyRound, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/field";
import { formatDateTime } from "@/lib/utils";
import { useFormPanel, useOneTimeValue } from "@/lib/use-form-panel";
import { createApiKey, revokeApiKey, type ApiKeyRow } from "@/server/apikey-actions";
import type { ActionState } from "@/server/actions";

type CreateState = ActionState & { apiKey?: string };

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <KeyRound className="h-4 w-4" />
      {pending ? "Generando…" : "Generar key"}
    </Button>
  );
}

export function ApiKeysManager({
  keys,
  companies,
}: {
  keys: ApiKeyRow[];
  companies: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState<CreateState, FormData>(createApiKey, {});
  const panel = useFormPanel(state);
  const generada = useOneTimeValue(state, (s) => s.apiKey);
  const [isPending, startTransition] = useTransition();
  const nueva = generada.value;

  return (
    <div>
      {nueva && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-emerald-900">
                Guardá esta key ahora: no se vuelve a mostrar.
              </p>
              <code className="mt-1 block break-all rounded bg-white px-2 py-1 font-mono text-xs text-emerald-900">
                {nueva}
              </code>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                size="icon"
                variant="ghost"
                title="Copiar"
                onClick={() => navigator.clipboard.writeText(nueva)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" title="Cerrar" onClick={generada.dismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex justify-end">
        {panel.open ? (
          <Button variant="secondary" onClick={panel.hide}>
            <X className="h-4 w-4" /> Cancelar
          </Button>
        ) : (
          <Button onClick={panel.show}>
            <Plus className="h-4 w-4" /> Nueva API key
          </Button>
        )}
      </div>

      {panel.open && (
        <form
          action={formAction}
          className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="key-name">Etiqueta</Label>
              <Input id="key-name" name="name" placeholder="Importador de recibos" required />
            </div>
            <div>
              <Label htmlFor="key-company">Alcance</Label>
              <Select id="key-company" name="companyId" defaultValue="">
                <option value="">Todas las empresas</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    Solo {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <SubmitBtn />
        </form>
      )}

      {keys.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
          Todavía no generaste ninguna API key.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {keys.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{k.name}</p>
                <p className="truncate text-xs text-slate-500">
                  <code className="font-mono">{k.prefix}…</code> ·{" "}
                  {k.company ? `Solo ${k.company}` : "Todas las empresas"} ·{" "}
                  {k.lastUsedAt ? `Usada ${formatDateTime(k.lastUsedAt)}` : "Nunca usada"}
                </p>
              </div>
              {k.isActive ? (
                <>
                  <Badge tone="success">Activa</Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Desactivar"
                    disabled={isPending}
                    onClick={() => {
                      if (!confirm(`¿Desactivar la key "${k.name}"?`)) return;
                      startTransition(() => void revokeApiKey(k.id));
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </>
              ) : (
                <Badge tone="danger">Desactivada</Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
