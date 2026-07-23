"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { IdCard, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import { formatDate } from "@/lib/utils";
import { useFormPanel } from "@/lib/use-form-panel";
import { updateEmployee, type ActionState } from "@/server/actions";

type Employee = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  legajo: string | null;
  dni: string | null;
  address: string | null;
  position: string | null;
  profileCompletedAt: string | null;
};

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Guardar cambios"}
    </Button>
  );
}

function Dato({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm text-slate-800">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

/**
 * Datos personales del empleado. Los carga el empleado en su primer ingreso;
 * acá solo el admin los puede editar.
 */
export function PersonalDataCard({ employee }: { employee: Employee }) {
  const [state, formAction] = useActionState<ActionState, FormData>(updateEmployee, {});
  const panel = useFormPanel(state);

  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IdCard className="h-4 w-4 text-slate-400" />
          Datos personales
          {employee.profileCompletedAt ? (
            <Badge tone="success">Cargados por el empleado</Badge>
          ) : (
            <Badge tone="warning">Pendientes de carga</Badge>
          )}
        </CardTitle>
        {!panel.open && (
          <Button size="sm" variant="outline" onClick={panel.show}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
        )}
        {panel.open && (
          <Button size="icon" variant="ghost" onClick={panel.hide}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {panel.open ? (
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="employeeId" value={employee.id} />
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="firstName">Nombre/s</Label>
                <Input id="firstName" name="firstName" defaultValue={employee.firstName ?? ""} />
              </div>
              <div>
                <Label htmlFor="lastName">Apellido</Label>
                <Input id="lastName" name="lastName" defaultValue={employee.lastName ?? ""} />
              </div>
              <div>
                <Label htmlFor="dni">DNI</Label>
                <Input id="dni" name="dni" defaultValue={employee.dni ?? ""} />
              </div>
              <div>
                <Label htmlFor="legajo">Legajo</Label>
                <Input id="legajo" name="legajo" defaultValue={employee.legajo ?? ""} />
              </div>
              <div>
                <Label htmlFor="position">Puesto</Label>
                <Input id="position" name="position" defaultValue={employee.position ?? ""} />
              </div>
              <div>
                <Label htmlFor="address">Dirección</Label>
                <Input id="address" name="address" defaultValue={employee.address ?? ""} />
              </div>
            </div>
            <SubmitBtn />
          </form>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Dato label="Nombre/s" value={employee.firstName} />
            <Dato label="Apellido" value={employee.lastName} />
            <Dato label="DNI" value={employee.dni} />
            <Dato label="Legajo" value={employee.legajo} />
            <Dato label="Puesto" value={employee.position} />
            <Dato label="Dirección" value={employee.address} />
            {employee.profileCompletedAt && (
              <Dato label="Cargado el" value={formatDate(employee.profileCompletedAt)} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
