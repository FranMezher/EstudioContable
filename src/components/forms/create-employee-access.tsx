"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
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
 * Da de alta el acceso de un empleado. El importador nunca lo hace solo: un
 * CUIL mal leído no puede terminar en un acceso a los recibos de otra persona.
 * La contraseña provisoria se muestra una sola vez.
 */
export function CreateEmployeeAccess({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(createUser, {});

  if (state.password) {
    return (
      <div className="w-full rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
        <p className="font-medium text-emerald-900">
          Acceso creado. Entregale estos datos a {employeeName}:
        </p>
        <p className="mt-1 text-emerald-800">
          Usuario: <strong>su CUIL</strong> · Contraseña provisoria:{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-emerald-900">
            {state.password}
          </code>
        </p>
        <p className="mt-1 text-xs text-emerald-700">
          Se le va a pedir que la cambie en el primer ingreso. Esta pantalla no la vuelve a mostrar.
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

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="role" value="EMPLOYEE" />
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="name" value={employeeName} />
      {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      <SubmitBtn />
    </form>
  );
}
