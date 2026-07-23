"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, type LoginState } from "./actions";
import { Input, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { AlertCircle, LogIn } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      <LogIn className="h-4 w-4" />
      {pending ? "Ingresando…" : "Ingresar"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}
      <div>
        <Label htmlFor="identifier">Email o CUIL</Label>
        <Input
          id="identifier"
          name="identifier"
          type="text"
          inputMode="text"
          autoComplete="username"
          autoCapitalize="none"
          placeholder="tucorreo@ejemplo.com o 20-12345678-9"
          required
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Si sos empleado, ingresá con tu CUIL (con o sin guiones).
        </p>
      </div>
      <div>
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </div>
      <SubmitButton />

      <p className="text-center text-sm">
        <Link href="/recuperar" className="font-medium text-brand-600 hover:text-brand-700">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </form>
  );
}
