"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { PeriodFields } from "@/components/period-fields";
import { useFormPanel } from "@/lib/use-form-panel";
import { uploadPayslip, type ActionState } from "@/server/actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Upload className="h-4 w-4" />
      {pending ? "Subiendo…" : "Subir recibo"}
    </Button>
  );
}

export function UploadPayslipForm({ employeeId }: { employeeId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(uploadPayslip, {});
  const panel = useFormPanel(state);

  if (!panel.open) {
    return (
      <Button onClick={panel.show}>
        <Upload className="h-4 w-4" /> Cargar recibo
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="w-full space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="employeeId" value={employeeId} />

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">Cargar recibo</p>
        <Button type="button" size="icon" variant="ghost" onClick={panel.hide}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <PeriodFields />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="netAmount">Neto (opcional)</Label>
          <Input id="netAmount" name="netAmount" type="number" step="0.01" placeholder="0.00" />
        </div>
        <div>
          <Label htmlFor="file">Archivo PDF</Label>
          <Input id="file" name="file" type="file" accept=".pdf,application/pdf" required />
        </div>
      </div>

      <SubmitBtn />
    </form>
  );
}
