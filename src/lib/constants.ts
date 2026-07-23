export const BRAND = {
  name: "Mezher Pampin",
  monogram: "MP",
  tagline: "Recibos de Sueldo",
} as const;

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

export const MESES_CORTOS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export const SETTING_KEYS = {
  CONTACT_EMAIL: "contact_email",
} as const;

export function periodoLabel(month: number | null | undefined, year: number) {
  if (!month) return `${year}`;
  return `${MESES[month - 1]} ${year}`;
}

export function periodoCorto(month: number, year: number) {
  return `${MESES_CORTOS[month - 1]} ${year}`;
}

/** Deja solo los dígitos de un CUIL/CUIT. Es la forma en que se guarda. */
export function normalizeCuil(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

/** Formatea un CUIL guardado (11 dígitos) como 20-12345678-9. */
export function formatCuil(value: string | null | undefined): string {
  const d = normalizeCuil(value);
  if (d.length !== 11) return value ?? "";
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}

/** Valida el dígito verificador de un CUIL/CUIT argentino. */
export function isValidCuil(value: string | null | undefined): boolean {
  const d = normalizeCuil(value);
  if (d.length !== 11) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((acc, p, i) => acc + p * Number(d[i]), 0);
  const resto = suma % 11;
  const verificador = resto === 0 ? 0 : resto === 1 ? 9 : 11 - resto;
  return verificador === Number(d[10]);
}
