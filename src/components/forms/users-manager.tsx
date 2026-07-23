"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Copy, KeyRound, Power, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/field";
import { formatCuil } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { useFormPanel, useOneTimeValue } from "@/lib/use-form-panel";
import { createUser, resetUserPassword, setUserActive, type ActionState } from "@/server/actions";
import type { UserRow } from "@/server/users-queries";

const ROLE_LABEL: Record<UserRow["role"], string> = {
  STUDIO_ADMIN: "Estudio",
  COMPANY_ADMIN: "Admin de empresa",
  EMPLOYEE: "Empleado",
};

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <UserPlus className="h-4 w-4" />
      {pending ? "Creando…" : "Crear acceso"}
    </Button>
  );
}

function PasswordNotice({ password, onClose }: { password: string; onClose: () => void }) {
  return (
    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-emerald-900">Contraseña provisoria</p>
          <code className="mt-1 inline-block rounded bg-white px-2 py-1 font-mono text-emerald-900">
            {password}
          </code>
          <p className="mt-1 text-xs text-emerald-700">
            Anotala ahora: no se vuelve a mostrar. Se pide cambiarla en el primer ingreso.
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            title="Copiar"
            onClick={() => navigator.clipboard.writeText(password)}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" title="Cerrar" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function UsersManager({
  users,
  companies,
  canCreateStudioAdmin,
}: {
  users: UserRow[];
  /** Vacío para el admin de empresa: su empresa se resuelve del alcance. */
  companies?: { id: string; name: string }[];
  canCreateStudioAdmin: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(createUser, {});
  const panel = useFormPanel(state);
  const nueva = useOneTimeValue(state, (s) => s.password);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  // La contraseña del "restablecer" llega desde un handler, no desde el form.
  const [resetPassword, setResetPassword] = useState<string>();

  const password = resetPassword ?? nueva.value;

  return (
    <div>
      {password && (
        <PasswordNotice
          password={password}
          onClose={() => {
            setResetPassword(undefined);
            nueva.dismiss();
          }}
        />
      )}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="mb-4 flex justify-end">
        {panel.open ? (
          <Button variant="secondary" onClick={panel.hide}>
            <X className="h-4 w-4" /> Cancelar
          </Button>
        ) : (
          <Button onClick={panel.show}>
            <UserPlus className="h-4 w-4" /> Nuevo acceso
          </Button>
        )}
      </div>

      {panel.open && (
        <form
          action={formAction}
          className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <p className="text-sm text-slate-600">
            El acceso de un empleado se crea desde su ficha, para que quede atado a su legajo.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="user-role">Tipo de acceso</Label>
              <Select id="user-role" name="role" defaultValue="COMPANY_ADMIN" required>
                <option value="COMPANY_ADMIN">Administrador de empresa</option>
                {canCreateStudioAdmin && <option value="STUDIO_ADMIN">Estudio</option>}
              </Select>
            </div>
            {companies && companies.length > 0 && (
              <div>
                <Label htmlFor="user-company">Empresa</Label>
                <Select id="user-company" name="companyId" required>
                  <option value="">— Elegir —</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="user-name">Nombre</Label>
              <Input id="user-name" name="name" required />
            </div>
            <div>
              <Label htmlFor="user-email">Email</Label>
              <Input id="user-email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="user-password">Contraseña (opcional)</Label>
              <Input
                id="user-password"
                name="password"
                type="text"
                autoComplete="off"
                placeholder="Vacío = se genera una"
                minLength={6}
              />
            </div>
          </div>
          <SubmitBtn />
        </form>
      )}

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{u.name}</p>
              <p className="truncate text-xs text-slate-500">
                {u.email ?? formatCuil(u.cuil)}
                {u.company ? ` · ${u.company}` : ""} ·{" "}
                {u.lastLoginAt ? `Último ingreso ${formatDateTime(u.lastLoginAt)}` : "Nunca ingresó"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge tone={u.role === "STUDIO_ADMIN" ? "brand" : "neutral"}>
                {ROLE_LABEL[u.role]}
              </Badge>
              {u.mustChangePassword && <Badge tone="warning">Clave provisoria</Badge>}
              {!u.isActive && <Badge tone="danger">Desactivado</Badge>}

              <Button
                size="icon"
                variant="ghost"
                title="Restablecer contraseña"
                disabled={isPending}
                onClick={() => {
                  if (!confirm(`¿Restablecer la contraseña de ${u.name}?`)) return;
                  startTransition(async () => {
                    const res = await resetUserPassword(u.id);
                    if (res.error) setError(res.error);
                    if (res.password) setResetPassword(res.password);
                  });
                }}
              >
                <KeyRound className="h-4 w-4 text-slate-500" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title={u.isActive ? "Desactivar" : "Reactivar"}
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await setUserActive(u.id, !u.isActive);
                    if (res.error) setError(res.error);
                  })
                }
              >
                <Power className={u.isActive ? "h-4 w-4 text-red-500" : "h-4 w-4 text-emerald-600"} />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
