"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { useFormPanel } from "@/lib/use-form-panel";
import { createEmployee, type ActionState } from "@/server/actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <UserPlus className="h-4 w-4" />
      {pending ? "Creando…" : "Crear empleado"}
    </Button>
  );
}

export function NewEmployeeForm({ companyId }: { companyId?: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(createEmployee, {});
  const panel = useFormPanel(state);

  if (!panel.open) {
    return (
      <Button onClick={panel.show}>
        <UserPlus className="h-4 w-4" /> Nuevo empleado
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="w-full space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      {/* El servidor valida este id contra el alcance del usuario. */}
      {companyId && <input type="hidden" name="companyId" value={companyId} />}

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">Nuevo empleado</p>
        <Button type="button" size="icon" variant="ghost" onClick={panel.hide}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="emp-name">Nombre y apellido</Label>
          <Input id="emp-name" name="name" required autoFocus />
        </div>
        <div>
          <Label htmlFor="emp-cuil">CUIL</Label>
          <Input id="emp-cuil" name="cuil" placeholder="20-12345678-9" required />
        </div>
        <div>
          <Label htmlFor="emp-position">Puesto (opcional)</Label>
          <Input id="emp-position" name="position" />
        </div>
      </div>
      <SubmitBtn />
    </form>
  );
}
