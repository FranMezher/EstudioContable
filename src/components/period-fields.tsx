"use client";

import { MESES } from "@/lib/constants";
import { Label, Select } from "@/components/ui/field";

export function PeriodFields({
  includeMonth = true,
  monthRequired = false,
}: {
  includeMonth?: boolean;
  monthRequired?: boolean;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYear - i + 1);

  return (
    <div className="grid grid-cols-2 gap-3">
      {includeMonth && (
        <div>
          <Label htmlFor="periodMonth">Mes {monthRequired ? "" : "(opcional)"}</Label>
          <Select
            id="periodMonth"
            name="periodMonth"
            defaultValue={String(new Date().getMonth() + 1)}
            required={monthRequired}
          >
            {!monthRequired && <option value="">— Anual —</option>}
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div className={includeMonth ? "" : "col-span-2"}>
        <Label htmlFor="periodYear">Año</Label>
        <Select id="periodYear" name="periodYear" defaultValue={String(currentYear)} required>
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
