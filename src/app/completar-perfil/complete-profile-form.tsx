"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { useSession } from "next-auth/react";
import { AlertCircle, Check } from "lucide-react";
import { Input, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { completeMyProfile, type ActionState } from "@/server/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      <Check className="h-4 w-4" />
      {pending ? "Guardando…" : "Guardar y continuar"}
    </Button>
  );
}

export function CompleteProfileForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(completeMyProfile, {});
  const { update } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) return;
    void update({ profilePending: false }).then(() => router.replace("/mis-recibos"));
  }, [state.ok, update, router]);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">Nombre/s</Label>
          <Input id="firstName" name="firstName" autoComplete="given-name" required />
        </div>
        <div>
          <Label htmlFor="lastName">Apellido</Label>
          <Input id="lastName" name="lastName" autoComplete="family-name" required />
        </div>
        <div>
          <Label htmlFor="dni">DNI</Label>
          <Input id="dni" name="dni" inputMode="numeric" placeholder="30123456" required />
        </div>
        <div>
          <Label htmlFor="legajo">Legajo</Label>
          <Input id="legajo" name="legajo" placeholder="1020" />
        </div>
      </div>

      <div>
        <Label htmlFor="address">Dirección</Label>
        <Input id="address" name="address" autoComplete="street-address" placeholder="Calle 123, Ciudad" />
      </div>

      <SubmitButton />
    </form>
  );
}
