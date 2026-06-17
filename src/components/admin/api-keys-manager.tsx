"use client";

import { useState, useEffect, useActionState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Plus, X, KeyRound, Copy, Check, Trash2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/utils";
import { createApiKey, revokeApiKey, type ApiKeyState } from "@/server/admin-actions";

export type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  scopeLabel: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Generando…" : "Generar API key"}
    </Button>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
      <code className="min-w-0 flex-1 break-all text-sm text-amber-900">{value}</code>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copiada" : "Copiar"}
      </Button>
    </div>
  );
}

export function ApiKeysManager({
  clients,
  keys,
}: {
  clients: { id: string; name: string }[];
  keys: ApiKeyRow[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction] = useActionState<ApiKeyState, FormData>(createApiKey, {});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (state.ok) setShowForm(false);
  }, [state.ok]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>API keys</CardTitle>
        <Button size="sm" variant={showForm ? "secondary" : "primary"} onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancelar" : "Nueva key"}
        </Button>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-slate-500">
          Para integraciones y carga masiva vía API. Una key con <strong>acceso total</strong> puede operar
          sobre todos los clientes; una key <strong>limitada a un cliente</strong> solo sobre ese.
        </p>

        {state.ok && state.fullKey && (
          <div className="mb-5 space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-amber-700">
              <ShieldAlert className="h-4 w-4" />
              Copiá la key ahora — no se vuelve a mostrar.
            </p>
            <CopyField value={state.fullKey} />
          </div>
        )}

        {showForm && (
          <form action={formAction} className="mb-5 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <div>
              <Label htmlFor="name">Nombre / descripción</Label>
              <Input id="name" name="name" placeholder="Ej: Script de carga AFIP" required />
            </div>
            <div>
              <Label htmlFor="clientId">Alcance</Label>
              <Select id="clientId" name="clientId" defaultValue="">
                <option value="">Acceso total (todos los clientes)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    Solo: {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <SubmitBtn />
          </form>
        )}

        {keys.length === 0 ? (
          <EmptyState title="Sin API keys" description="Generá una para empezar a usar la API." icon={KeyRound} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {keys.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{k.name}</p>
                    <p className="text-xs text-slate-500">
                      <code>{k.prefix}…</code> · {k.scopeLabel} ·{" "}
                      {k.lastUsedAt ? `último uso ${formatDateTime(k.lastUsedAt)}` : "sin uso"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {k.isActive ? <Badge tone="success">Activa</Badge> : <Badge tone="danger">Revocada</Badge>}
                  {k.isActive && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => {
                        if (confirm("¿Revocar esta API key? Dejará de funcionar de inmediato."))
                          startTransition(() => revokeApiKey(k.id));
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" /> Revocar
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
