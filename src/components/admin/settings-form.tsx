"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Save, Send, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { setInquiryEmail, sendTestEmail, type ActionState } from "@/server/admin-actions";

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Save className="h-4 w-4" /> {pending ? "Guardando…" : "Guardar"}
    </Button>
  );
}

function TestBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      <Send className="h-4 w-4" /> {pending ? "Enviando…" : "Enviar email de prueba"}
    </Button>
  );
}

export function SettingsForm({ inquiryEmail }: { inquiryEmail: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(setInquiryEmail, {});
  const [testState, testAction] = useActionState<ActionState, FormData>(sendTestEmail, {});

  useEffect(() => {
    if (testState.error) alert(testState.error);
    if (testState.ok) alert("Email de prueba enviado.");
  }, [testState]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email de consultas</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-3">
            <p className="text-sm text-slate-500">
              Las consultas que envían los clientes llegan a esta casilla.
            </p>
            <div>
              <Label htmlFor="email">Email destino</Label>
              <Input id="email" name="email" type="email" defaultValue={inquiryEmail} required />
            </div>
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            {state.ok && (
              <p className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Guardado correctamente.
              </p>
            )}
            <SaveBtn />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Probar configuración de emails</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={testAction}>
            <p className="mb-3 text-sm text-slate-500">
              Envía un email de prueba a la casilla configurada para verificar que Resend está funcionando.
            </p>
            <TestBtn />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
