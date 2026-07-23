import path from "node:path";
import { extractText, getDocumentProxy } from "unpdf";

/**
 * Extrae los datos de un recibo para asignarlo a su empresa y empleado.
 *
 * El nombre del archivo trae el legajo y el número de liquidación
 * ("Recibos de Sueldos-Liq 1207 -Leg 1020"), pero NO el período ni el CUIL,
 * así que el PDF se lee siempre. Si el PDF es un escaneo sin texto, queda lo
 * poco que da el nombre y el archivo se marca como pendiente.
 */

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

export type Detected = {
  employerCuit: string | null;
  cuil: string | null;
  legajo: string | null;
  dni: string | null;
  employeeName: string | null;
  periodMonth: number | null;
  periodYear: number | null;
  netAmount: number | null;
  liqNumber: string | null;
  /** De dónde salieron los datos, para el informe. */
  from: "nombre" | "contenido" | "nada";
};

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/** Número con coma de miles y punto decimal (986,760.35) o formato AR. */
function parseAmount(raw: string): number | null {
  const t = raw.trim();
  let normalized: string;
  if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(t)) {
    normalized = t.replace(/,/g, ""); // US: coma miles, punto decimal
  } else if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(t)) {
    normalized = t.replace(/\./g, "").replace(",", "."); // AR: punto miles, coma decimal
  } else {
    normalized = t.replace(/[^\d.]/g, "");
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Período desde "Remuneración Correspondiente a: ABRIL 2026" y variantes. */
function findPeriod(text: string): { month: number; year: number } | null {
  const corr = text.match(
    /correspondiente\s+a:?\s*(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(20\d{2})/i
  );
  if (corr) return { month: MESES[corr[1].toLowerCase()], year: Number(corr[2]) };

  const suelto = text.toLowerCase().match(
    /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(20\d{2})/
  );
  if (suelto) return { month: MESES[suelto[1]], year: Number(suelto[2]) };

  const iso = text.match(/(20\d{2})[-_./](0?[1-9]|1[0-2])(?!\d)/);
  if (iso) return { month: Number(iso[2]), year: Number(iso[1]) };

  return null;
}

/** Lee el texto del PDF. Devuelve "" si es un escaneo sin capa de texto. */
export async function readPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  } catch {
    return "";
  }
}

function parseFromText(text: string): Partial<Detected> {
  const cuit = text.match(/C\.?U\.?I\.?T\.?\s*:?\s*([\d.\-]{11,15})/i);
  const cuil = text.match(/CUIL\s*:?\s*([\d.\-]{11,15})/i);
  const legajo = text.match(/Legajo\s*N?[º°]?\s*:?\s*([\d.,]+)/i);
  const dni = text.match(/DNI\s*:?\s*(\d{7,9})/i);
  const name = text.match(/Beneficiario\s*:?\s*(.+?)\s+Legajo/i);
  const net = text.match(/NETO\s+A\s+COBRAR\s*\$?\s*([\d.,]+)/i);
  const period = findPeriod(text);

  return {
    employerCuit: cuit ? digits(cuit[1]) : null,
    cuil: cuil ? digits(cuil[1]) : null,
    legajo: legajo ? digits(legajo[1]) : null,
    dni: dni ? digits(dni[1]) : null,
    employeeName: name ? name[1].trim().replace(/\s+/g, " ") : null,
    netAmount: net ? parseAmount(net[1]) : null,
    periodMonth: period?.month ?? null,
    periodYear: period?.year ?? null,
  };
}

function parseFromFileName(fileName: string): { legajo: string | null; liqNumber: string | null } {
  const leg = fileName.match(/Leg\.?\s*(\d+)/i);
  const liq = fileName.match(/Liq\.?\s*(\d+)/i);
  return { legajo: leg ? leg[1] : null, liqNumber: liq ? liq[1] : null };
}

export async function detectPayslip(filePath: string, buffer: Buffer): Promise<Detected> {
  const fileName = path.basename(filePath);
  const fromName = parseFromFileName(fileName);

  const text = await readPdfText(buffer);
  const fromText = text ? parseFromText(text) : {};

  const cuil = fromText.cuil ?? null;
  const legajo = fromText.legajo ?? fromName.legajo;
  const periodMonth = fromText.periodMonth ?? null;
  const periodYear = fromText.periodYear ?? null;

  const from: Detected["from"] = !legajo && !cuil ? "nada" : text ? "contenido" : "nombre";

  return {
    employerCuit: fromText.employerCuit ?? null,
    cuil,
    legajo,
    dni: fromText.dni ?? null,
    employeeName: fromText.employeeName ?? null,
    periodMonth,
    periodYear,
    netAmount: fromText.netAmount ?? null,
    liqNumber: fromName.liqNumber,
    from,
  };
}
