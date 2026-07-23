"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Copy, KeyRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { createUser, type ActionState } from "@/server/actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button size="sm" type="submit" disabled={pending}>
      <KeyRound className="h-4 w-4" />
      {pending ? "Creando…" : "Crear acceso"}
    </Button>
  );
}

/**
 * Da de alta el acceso de un empleado. El admin puede escribir una contraseña
 * o dejar el campo vacío para que se genere una provisoria. En ambos casos se
 * pide cambiarla en el primer ingreso. El importador nunca crea accesos solo.
 */
export function CreateEmployeeAccess({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(createUser, {});

  if (state.password) {
    return (
      <div className="w-full rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
        <p className="font-medium text-emerald-900">
          Acceso creado. Entregale estos datos a {employeeName}:
        </p>
        <p className="mt-1 text-emerald-800">
          Usuario: <strong>su CUIL</strong> · Contraseña:{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-emerald-900">
            {state.password}
          </code>
        </p>
        <p className="mt-1 text-xs text-emerald-700">
          Se le va a pedir cambiarla en el primer ingreso. Esta pantalla no la vuelve a mostrar.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={() => navigator.clipboard.writeText(state.password ?? "")}
        >
          <Copy className="h-4 w-4" /> Copiar contraseña
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <KeyRound className="h-4 w-4" /> Crear acceso
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="w-full space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
    >
      <input type="hidden" name="role" value="EMPLOYEE" />
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="name" value={employeeName} />

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-800">Crear acceso para {employeeName}</p>
        <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <p className="text-xs text-slate-500">
        El empleado entra con su <strong>CUIL</strong>. Elegí una contraseña o dejala vacía para que
        se genere una automáticamente.
      </p>
      <div>
        <Label htmlFor={`pass-${employeeId}`}>Contraseña (opcional)</Label>
        <Input
          id={`pass-${employeeId}`}
          name="password"
          type="text"
          autoComplete="off"
          placeholder="Dejar vacío para generar una"
          minLength={6}
        />
      </div>

      <SubmitBtn />
    </form>
  );
}
