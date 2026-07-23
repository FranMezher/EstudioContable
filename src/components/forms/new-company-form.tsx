"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Building2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { useFormPanel } from "@/lib/use-form-panel";
import { createCompany, type ActionState } from "@/server/actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Building2 className="h-4 w-4" />
      {pending ? "Creando…" : "Crear empresa"}
    </Button>
  );
}

export function NewCompanyForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(createCompany, {});
  const panel = useFormPanel(state);

  if (!panel.open) {
    return (
      <Button onClick={panel.show}>
        <Plus className="h-4 w-4" /> Nueva empresa
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="w-full space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">Nueva empresa</p>
        <Button type="button" size="icon" variant="ghost" onClick={panel.hide}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <Label htmlFor="company-name">Razón social</Label>
        <Input id="company-name" name="name" required autoFocus />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="company-cuit">CUIT</Label>
          <Input id="company-cuit" name="cuit" placeholder="30-12345678-9" />
        </div>
        <div>
          <Label htmlFor="company-email">Email</Label>
          <Input id="company-email" name="email" type="email" />
        </div>
        <div>
          <Label htmlFor="company-phone">Teléfono</Label>
          <Input id="company-phone" name="phone" />
        </div>
      </div>
      <SubmitBtn />
    </form>
  );
}
