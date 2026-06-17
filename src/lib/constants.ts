import type { DeclarationType } from "@/generated/prisma/enums";

export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const DECLARATION_TYPES: Record<
  DeclarationType,
  { label: string; description: string; periodic: boolean }
> = {
  IVA: { label: "IVA", description: "Impuesto al Valor Agregado", periodic: true },
  IIBB: {
    label: "IIBB",
    description: "Ingresos Brutos",
    periodic: true,
  },
  GANANCIAS: {
    label: "Ganancias",
    description: "Impuesto a las Ganancias",
    periodic: false,
  },
  BALANCES: { label: "Balances", description: "Balances contables", periodic: false },
};

export const SETTING_KEYS = {
  INQUIRY_EMAIL: "inquiry_email",
} as const;

export function periodoLabel(month: number | null | undefined, year: number) {
  if (!month) return `${year}`;
  return `${MESES[month - 1]} ${year}`;
}
