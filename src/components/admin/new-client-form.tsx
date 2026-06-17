"use client";

import { useState, useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Plus, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { createClient, type ActionState } from "@/server/admin-actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creando…" : "Crear cliente"}
    </Button>
  );
}

export function NewClientForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(createClient, {});
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      // En createClient, cuando ok=true, error trae el id del cliente nuevo
      if (state.error) router.push(`/admin/clientes/${state.error}`);
      else router.refresh();
    }
  }, [state, router]);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nuevo cliente
      </Button>
    );
  }

  return (
    <Card className="mb-6">
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Nuevo cliente</h3>
          <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form action={formAction} className="space-y-4">
          {state.error && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Datos del cliente
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Razón social / Nombre *</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="cuit">CUIT</Label>
                <Input id="cuit" name="cuit" placeholder="30-12345678-9" />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" name="phone" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="email">Email de contacto</Label>
                <Input id="email" name="email" type="email" />
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Cuenta de acceso del cliente
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="userName">Nombre del usuario *</Label>
                <Input id="userName" name="userName" required />
              </div>
              <div>
                <Label htmlFor="userEmail">Email de acceso *</Label>
                <Input id="userEmail" name="userEmail" type="email" required />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="userPassword">Contraseña inicial *</Label>
                <Input id="userPassword" name="userPassword" type="text" minLength={6} required />
                <p className="mt-1 text-xs text-slate-400">
                  Compartila con el cliente. Podrá cambiarla después.
                </p>
              </div>
            </div>
          </div>

          <SubmitBtn />
        </form>
      </CardContent>
    </Card>
  );
}
