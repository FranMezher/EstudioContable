import path from "node:path";
import { extractText, getDocumentProxy } from "unpdf";

/**
 * Extrae los datos de un recibo para asignarlo a su empresa y empleado.
 *
 * Del nombre del archivo solo sale el número de liquidación (y el legajo, si
 * está): "Recibos de Sueldos - Liq 755.pdf". Todo lo demás se lee del PDF.
 *
 * Soporta los dos formatos de liquidación que usa el estudio, que ordenan el
 * texto muy distinto. Por eso cada dato se busca con varios patrones, del más
 * explícito al más tolerante:
 *
 *   Formato A   "C.U.I.T.: 30-..."  ·  "Legajo Nº: 1,020"  ·  "NETO A COBRAR"
 *   Formato B   "23-...-4CUIT:"     ·  "JUANA 1,006 CUIL:"  ·  "SUELDO NETO"
 *
 * Si el PDF es un escaneo sin capa de texto no se adivina nada: el archivo
 * queda pendiente de revisión.
 */

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

const MES_RE =
  "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre";

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
  from: "nombre" | "contenido" | "nada";
};

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/** Devuelve el primer grupo capturado por el primer patrón que matchee. */
function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

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

/**
 * Período del recibo. Primero la etiqueta explícita del formato A; si no,
 * el primer "MES AAAA" del documento (en el formato B el mes del último
 * depósito viene sin año, así que no se confunde).
 */
function findPeriod(text: string): { month: number; year: number } | null {
  const m =
    text.match(new RegExp(`correspondiente\\s+a:?\\s*(${MES_RE})\\s+(20\\d{2})`, "i")) ??
    text.match(new RegExp(`(${MES_RE})\\s+(20\\d{2})`, "i"));
  if (m) return { month: MESES[m[1].toLowerCase()], year: Number(m[2]) };

  const iso = text.match(/(20\d{2})[-_./](0?[1-9]|1[0-2])(?!\d)/);
  if (iso) return { month: Number(iso[2]), year: Number(iso[1]) };

  return null;
}

/** Descarta capturas que en realidad son una etiqueta ("Nº", "Legajo", …). */
function cleanName(raw: string | null): string | null {
  if (!raw) return null;
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 5 || !name.includes(" ")) return null;
  if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ' ]+$/.test(name)) return null;
  return name;
}

/** Un legajo válido tiene entre 1 y 6 dígitos. */
function cleanLegajo(raw: string | null): string | null {
  const d = digits(raw);
  return d.length >= 1 && d.length <= 6 ? String(Number(d)) : null;
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
  const cuil = firstMatch(text, [/CUIL\s*:?\s*([\d.\-]{11,15})/i]);

  const employerCuit = firstMatch(text, [
    // Formato A: la etiqueta va primero.
    /C\.?U\.?I\.?T\.?\s*:?\s*([\d.\-]{11,15})/i,
    // Formato B: el valor va pegado antes de la etiqueta.
    /([\d.\-]{11,15})\s{0,3}C\.?U\.?I\.?T\.?\s*:/i,
  ]);

  const legajo = cleanLegajo(
    firstMatch(text, [
      // Formato A: etiqueta explícita.
      /Legajo\s*N?[º°]?\s*:?\s*([\d.,]+)/i,
      // Formato B: el legajo es el número justo antes de "CUIL:".
      /([\d][\d.,]*)\s*CUIL\s*:/i,
    ])
  );

  const employeeName =
    cleanName(firstMatch(text, [/Beneficiario\s*:?\s*(.+?)\s+Legajo/i])) ??
    // Formato B: va después de "Original/Duplicado (...)" y antes del legajo.
    cleanName(
      firstMatch(text, [/(?:Original|Duplicado)\s*\([^)]*\)\s*(.+?)\s+[\d.,]+\s*CUIL\s*:/i])
    );

  const net = firstMatch(text, [
    /(?:NETO\s+A\s+COBRAR|SUELDO\s+NETO)\s*\$?\s*([\d.,]+)/i,
  ]);

  const dni = firstMatch(text, [/DNI\s*:?\s*(\d{7,9})/i]);
  const period = findPeriod(text);

  return {
    employerCuit: employerCuit ? digits(employerCuit) : null,
    cuil: cuil ? digits(cuil) : null,
    legajo,
    dni: dni ? digits(dni) : null,
    employeeName,
    netAmount: net ? parseAmount(net) : null,
    periodMonth: period?.month ?? null,
    periodYear: period?.year ?? null,
  };
}

/** Del nombre del archivo: "…-Liq 755 -Leg 1006.pdf" (el legajo es opcional). */
function parseFromFileName(fileName: string) {
  const leg = fileName.match(/Leg\.?\s*(\d+)/i);
  const liq = fileName.match(/Liq\.?\s*(\d+)/i);
  return { legajo: leg ? leg[1] : null, liqNumber: liq ? liq[1] : null };
}

export async function detectPayslip(filePath: string, buffer: Buffer): Promise<Detected> {
  const fromName = parseFromFileName(path.basename(filePath));

  const text = await readPdfText(buffer);
  const fromText = text ? parseFromText(text) : {};

  const cuil = fromText.cuil ?? null;
  // El contenido del PDF manda sobre el nombre del archivo.
  const legajo = fromText.legajo ?? fromName.legajo;

  const from: Detected["from"] = !legajo && !cuil ? "nada" : text ? "contenido" : "nombre";

  return {
    employerCuit: fromText.employerCuit ?? null,
    cuil,
    legajo,
    dni: fromText.dni ?? null,
    employeeName: fromText.employeeName ?? null,
    periodMonth: fromText.periodMonth ?? null,
    periodYear: fromText.periodYear ?? null,
    netAmount: fromText.netAmount ?? null,
    liqNumber: fromName.liqNumber,
    from,
  };
}
