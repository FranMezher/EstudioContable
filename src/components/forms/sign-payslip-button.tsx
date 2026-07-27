"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, PenLine, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { useFormPanel } from "@/lib/use-form-panel";
import { signPayslip, type ActionState } from "@/server/actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <PenLine className="h-4 w-4" />
      {pending ? "Firmando…" : "Firmar"}
    </Button>
  );
}

/**
 * Botón + diálogo para que el empleado firme su recibo. La firma es
 * electrónica (art. 5, Ley 25.506): pide re-ingresar la contraseña y guarda la
 * declaración de conformidad junto con la huella del documento.
 */
export function SignPayslipButton({
  payslipId,
  periodo,
}: {
  payslipId: string;
  periodo: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(signPayslip, {});
  const panel = useFormPanel(state);

  return (
    <>
      <Button size="sm" variant="accent" onClick={panel.show}>
        <PenLine className="h-4 w-4" /> Firmar
      </Button>

      {panel.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-[2px]"
          onClick={panel.hide}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
                <ShieldCheck className="h-5 w-5 text-brand-600" />
                Firmar recibo · {periodo}
              </h3>
              <button
                onClick={panel.hide}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={formAction} className="space-y-4 px-5 py-5">
              <input type="hidden" name="payslipId" value={payslipId} />

              <div className="rounded-xl border border-ink-200 bg-ink-50/70 p-3.5 text-[13px] leading-relaxed text-ink-700">
                Declaro haber recibido y revisado mi recibo de haberes del período{" "}
                <strong>{periodo}</strong>, y manifiesto mi <strong>conformidad</strong> conforme al
                art. 138 y ss. de la Ley de Contrato de Trabajo. Firmo este documento en forma
                electrónica (art. 5, Ley 25.506), reconociéndolo como propio.
              </div>

              <p className="text-xs text-ink-500">
                Al firmar se registran la fecha y hora, tu identidad, la huella digital del documento
                y el dispositivo, como constancia. La firma no se puede deshacer.
              </p>

              {state.error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {state.error}
                </div>
              )}

              <label className="flex items-start gap-2.5 text-sm text-ink-700">
                <input
                  type="checkbox"
                  name="acepta"
                  value="1"
                  required
                  className="mt-0.5 h-5 w-5 rounded border-ink-300 text-brand-600 focus:ring-2 focus:ring-brand-500/30"
                />
                Leí y acepto la declaración de conformidad.
              </label>

              <div>
                <Label htmlFor="sign-pass">Confirmá tu contraseña para firmar</Label>
                <Input
                  id="sign-pass"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="secondary" onClick={panel.hide}>
                  Cancelar
                </Button>
                <SubmitBtn />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
