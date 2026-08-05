"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, FileUp, ListChecks, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label, Select } from "@/components/ui/field";
import { bulkCreateEmployees, type BulkState } from "@/server/actions";
import type { BulkEmployeeRow } from "@/server/services";

const STATUS: Record<BulkEmployeeRow["status"], { label: string; tone: "success" | "neutral" | "danger" }> = {
  nuevo: { label: "Nuevo", tone: "success" },
  existe: { label: "Ya existe", tone: "neutral" },
  invalido: { label: "No válido", tone: "danger" },
};

export function BulkEmployees({ companies }: { companies: { id: string; name: string }[] }) {
  const [state, formAction, isPending] = useActionState<BulkState, FormData>(
    bulkCreateEmployees,
    {}
  );

  if (companies.length === 0) {
    return (
      <p className="text-sm text-ink-500">
        Primero creá una empresa (arriba, en Empresas). Después vas a poder subirle el listado de
        empleados desde acá.
      </p>
    );
  }

  const r = state.result;
  const puedeCrear = !!r && !state.created && r.nuevos > 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-600">
        Subí el listado de empleados de una empresa (PDF del sistema de sueldos, Excel{" "}
        <code className="rounded bg-ink-100 px-1 text-xs">.xlsx</code> o CSV) y se crean todos de una.
        Primero <strong>previsualizá</strong> para ver qué se va a cargar.
      </p>

      <form action={formAction} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="bulk-company">Empresa</Label>
            <Select id="bulk-company" name="companyId" required defaultValue="">
              <option value="" disabled>
                — Elegir empresa —
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="bulk-file">Archivo del listado</Label>
            <input
              id="bulk-file"
              name="file"
              type="file"
              accept=".pdf,.xlsx,.csv"
              required
              className="block w-full cursor-pointer rounded-lg border border-ink-300 bg-white text-sm text-ink-700 shadow-xs file:mr-3 file:cursor-pointer file:border-0 file:bg-ink-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink-700 hover:file:bg-ink-200"
            />
          </div>
        </div>

        {state.error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {state.error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" name="mode" value="preview" variant="secondary" disabled={isPending}>
            <ListChecks className="h-4 w-4" />
            {isPending ? "Procesando…" : "Previsualizar"}
          </Button>
          <Button
            type="submit"
            name="mode"
            value="create"
            disabled={isPending || !puedeCrear}
            title={!puedeCrear ? "Previsualizá primero" : undefined}
          >
            <Upload className="h-4 w-4" />
            {r ? `Crear ${r.nuevos} empleado${r.nuevos === 1 ? "" : "s"}` : "Crear empleados"}
          </Button>
        </div>
      </form>

      {r && (
        <div className="rounded-xl border border-ink-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-ink-800">
              {state.created ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <FileUp className="h-4 w-4 text-brand-600" />
              )}
              {state.created
                ? `Se crearon ${r.created} empleado${r.created === 1 ? "" : "s"} en ${r.companyName}`
                : `Vista previa · ${r.companyName}`}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="success">{r.nuevos} nuevos</Badge>
              {r.existentes > 0 && <Badge tone="neutral">{r.existentes} ya existen</Badge>}
              {r.invalidos > 0 && <Badge tone="danger">{r.invalidos} con problema</Badge>}
            </div>
          </div>

          {!state.created && r.nuevos > 0 && (
            <p className="border-b border-ink-100 bg-brand-50/40 px-4 py-2 text-xs text-brand-800">
              Revisá la lista y tocá <strong>Crear {r.nuevos}</strong> para darlos de alta. Los que
              ya existen o tienen problema no se tocan.
            </p>
          )}

          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-ink-50 text-left text-xs text-ink-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Empleado</th>
                  <th className="px-3 py-2 font-medium">CUIL</th>
                  <th className="px-3 py-2 font-medium">Legajo</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {r.rows.map((row, i) => {
                  const s = STATUS[row.status];
                  return (
                    <tr key={`${row.cuil}-${i}`} className="align-top">
                      <td className="px-4 py-2 text-ink-800">{row.name}</td>
                      <td className="tnum px-3 py-2 text-ink-600">{row.cuil}</td>
                      <td className="tnum px-3 py-2 text-ink-600">{row.legajo ?? "—"}</td>
                      <td className="px-3 py-2">
                        <Badge tone={s.tone}>{s.label}</Badge>
                        {row.reason && <span className="ml-2 text-xs text-ink-500">{row.reason}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {state.created && (
            <p className="flex items-center gap-2 border-t border-ink-100 px-4 py-3 text-sm text-ink-600">
              <Users className="h-4 w-4 text-ink-400" />
              Ya aparecen en la ficha de {r.companyName}. Todavía sin acceso al portal: creá el acceso
              de cada uno cuando quieras que puedan ingresar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
