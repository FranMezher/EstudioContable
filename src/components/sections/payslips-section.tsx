"use client";

import { useState, useEffect, useActionState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Download, Trash2, Receipt, X, UserPlus, ChevronDown, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { PeriodFields } from "@/components/period-fields";
import { periodoLabel } from "@/lib/constants";
import { formatMoney } from "@/lib/utils";
import {
  createEmployee,
  uploadPayslip,
  deletePayslip,
  type ActionState,
} from "@/server/actions";
import type { EmployeeDTO } from "@/server/queries";

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando…" : label}
    </Button>
  );
}

function EmployeeCard({
  employee,
  clientId,
  canManage,
}: {
  employee: EmployeeDTO;
  clientId?: string;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(uploadPayslip, {});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (state.ok) setShowUpload(false);
  }, [state.ok]);

  return (
    <div className="rounded-lg border border-slate-200">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button onClick={() => setOpen((v) => !v)} className="flex min-w-0 items-center gap-3 text-left">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            {employee.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">{employee.name}</p>
            <p className="truncate text-xs text-slate-500">
              {[employee.position, employee.cuil].filter(Boolean).join(" · ") || "—"} ·{" "}
              {employee.payslips.length} recibo(s)
            </p>
          </div>
        </button>
        <div className="flex items-center gap-1">
          {canManage && (
            <Button size="sm" variant="outline" onClick={() => { setOpen(true); setShowUpload((v) => !v); }}>
              <Upload className="h-4 w-4" /> Recibo
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={() => setOpen((v) => !v)}>
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 px-4 py-3">
          {showUpload && canManage && (
            <form action={formAction} className="mb-4 space-y-3 rounded-lg bg-slate-50 p-3">
              <input type="hidden" name="employeeId" value={employee.id} />
              {clientId && <input type="hidden" name="clientId" value={clientId} />}
              {state.error && <p className="text-sm text-red-600">{state.error}</p>}
              <PeriodFields monthRequired />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`net-${employee.id}`}>Neto (opcional)</Label>
                  <Input id={`net-${employee.id}`} name="netAmount" type="number" step="0.01" placeholder="0.00" />
                </div>
                <div>
                  <Label htmlFor={`file-${employee.id}`}>Archivo</Label>
                  <Input id={`file-${employee.id}`} name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required />
                </div>
              </div>
              <SubmitBtn label="Subir recibo" />
            </form>
          )}

          {employee.payslips.length === 0 ? (
            <p className="py-3 text-center text-sm text-slate-400">Sin recibos cargados</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {employee.payslips.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Receipt className="h-4 w-4 text-brand-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {periodoLabel(p.periodMonth, p.periodYear)}
                      </p>
                      {p.netAmount != null && (
                        <p className="text-xs text-slate-500">Neto: {formatMoney(p.netAmount)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <a href={p.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4" /> Ver
                      </Button>
                    </a>
                    {canManage && (
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => {
                          if (confirm("¿Eliminar este recibo?"))
                            startTransition(() => deletePayslip(p.id));
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function PayslipsSection({
  clientId,
  employees,
  canManage = true,
}: {
  clientId?: string;
  employees: EmployeeDTO[];
  canManage?: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(createEmployee, {});

  useEffect(() => {
    if (state.ok) setShowForm(false);
  }, [state.ok]);

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">Empleados y sus recibos de sueldo.</p>
          {canManage && (
            <Button size="sm" variant={showForm ? "secondary" : "primary"} onClick={() => setShowForm((v) => !v)}>
              {showForm ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {showForm ? "Cancelar" : "Nuevo empleado"}
            </Button>
          )}
        </div>

        {showForm && canManage && (
          <form action={formAction} className="mb-5 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            {clientId && <input type="hidden" name="clientId" value={clientId} />}
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <div>
              <Label htmlFor="name">Nombre y apellido</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cuil">CUIL (opcional)</Label>
                <Input id="cuil" name="cuil" placeholder="20-12345678-9" />
              </div>
              <div>
                <Label htmlFor="position">Puesto (opcional)</Label>
                <Input id="position" name="position" />
              </div>
            </div>
            <SubmitBtn label="Crear empleado" />
          </form>
        )}

        {employees.length === 0 ? (
          <EmptyState title="Sin empleados" description="Agregá empleados para cargar sus recibos." icon={Receipt} />
        ) : (
          <div className="space-y-3">
            {employees.map((e) => (
              <EmployeeCard key={e.id} employee={e} clientId={clientId} canManage={canManage} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
