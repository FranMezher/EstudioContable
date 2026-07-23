"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { useSession } from "next-auth/react";
import { AlertCircle, KeyRound } from "lucide-react";
import { Input, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { changeOwnPassword, type ActionState } from "@/server/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      <KeyRound className="h-4 w-4" />
      {pending ? "Guardando…" : "Guardar contraseña"}
    </Button>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(changeOwnPassword, {});
  const { update } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) return;
    // Refresca el token para que deje de exigir el cambio y vuelve al inicio.
    void update({ mustChangePassword: false }).then(() => router.replace("/"));
  }, [state.ok, update, router]);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}
      <div>
        <Label htmlFor="currentPassword">Contraseña actual</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div>
        <Label htmlFor="newPassword">Contraseña nueva</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="mt-1.5 text-xs text-slate-500">Mínimo 8 caracteres.</p>
      </div>
      <div>
        <Label htmlFor="confirmPassword">Repetir contraseña nueva</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <SubmitButton />
    </form>
  );
}
