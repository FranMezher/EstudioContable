"use client";

import { useState, useActionState, useEffect, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { UserPlus, X, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/field";
import {
  addClientUser,
  toggleUserActive,
  resetUserPassword,
  type ActionState,
} from "@/server/admin-actions";

export type ClientUser = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
};

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button size="sm" type="submit" disabled={pending}>
      {pending ? "Guardando…" : label}
    </Button>
  );
}

function ResetPassword({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(resetUserPassword, {});
  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      alert("Contraseña actualizada.");
    }
  }, [state.ok]);

  if (!open)
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <KeyRound className="h-4 w-4" /> Cambiar clave
      </Button>
    );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Input name="password" type="text" placeholder="Nueva contraseña" minLength={6} required className="h-8 w-44" />
      <SubmitBtn label="Guardar" />
      <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>
        <X className="h-4 w-4" />
      </Button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}

export function ClientUsers({ clientId, users }: { clientId: string; users: ClientUser[] }) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(addClientUser, {});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (state.ok) setShowForm(false);
  }, [state.ok]);

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">Cuentas que pueden ingresar a este cliente.</p>
          <Button size="sm" variant={showForm ? "secondary" : "primary"} onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {showForm ? "Cancelar" : "Agregar acceso"}
          </Button>
        </div>

        {showForm && (
          <form action={formAction} className="mb-5 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <input type="hidden" name="clientId" value={clientId} />
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="password">Contraseña inicial</Label>
                <Input id="password" name="password" type="text" minLength={6} required />
              </div>
            </div>
            <SubmitBtn label="Crear acceso" />
          </form>
        )}

        <ul className="divide-y divide-slate-100">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
                {u.isActive ? <Badge tone="success">Activo</Badge> : <Badge tone="danger">Inactivo</Badge>}
              </div>
              <div className="flex items-center gap-1">
                <ResetPassword userId={u.id} />
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => startTransition(() => toggleUserActive(u.id, !u.isActive))}
                >
                  {u.isActive ? (
                    <>
                      <ShieldOff className="h-4 w-4" /> Desactivar
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" /> Activar
                    </>
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
