"use client";

import { MESES } from "@/lib/constants";
import { Label, Select } from "@/components/ui/field";

/**
 * Mes y año del recibo. Por defecto apunta al mes anterior, que es el que se
 * está liquidando cuando alguien carga un recibo.
 */
export function PeriodFields() {
  const hoy = new Date();
  const anterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const years = Array.from({ length: 8 }, (_, i) => hoy.getFullYear() - i);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label htmlFor="periodMonth">Mes</Label>
        <Select
          id="periodMonth"
          name="periodMonth"
          defaultValue={String(anterior.getMonth() + 1)}
          required
        >
          {MESES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="periodYear">Año</Label>
        <Select
          id="periodYear"
          name="periodYear"
          defaultValue={String(anterior.getFullYear())}
          required
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
