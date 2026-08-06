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
  /** Tipo de liquidación si el recibo lo indica (Vacaciones, SAC, Final). */
  label: string | null;
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
  // Prioridad: la línea del recibo "Período liq.: JULIO 2026" (y variantes).
  const prio = text.match(
    new RegExp(`per[ií]odo\\s*(?:de\\s+)?liq[\\wáéíóúñ.]*\\s*:?\\s*(${MES_RE})\\s+(20\\d{2})`, "i")
  );
  if (prio) return { month: MESES[prio[1].toLowerCase()], year: Number(prio[2]) };

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

type PdfItem = { str?: string; transform?: number[] };

/**
 * Reconstruye las filas visuales del PDF por coordenadas. El texto "plano"
 * mezcla columnas; esto permite leer un campo (ej. "Período Liq.") junto a su
 * valor, que en el texto plano queda separado de la etiqueta.
 */
async function readPdfRows(buffer: Buffer): Promise<string[][]> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const rows: string[][] = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const items = (content.items as PdfItem[])
        .filter((it) => typeof it.str === "string" && it.str.trim().length > 0 && it.transform)
        .map((it) => ({ x: it.transform![4], y: it.transform![5], str: it.str! }));
      items.sort((a, b) => b.y - a.y || a.x - b.x);
      let curY = Infinity;
      let cur: { x: number; str: string }[] = [];
      const flush = () => {
        if (cur.length) rows.push(cur.sort((a, b) => a.x - b.x).map((c) => c.str));
        cur = [];
      };
      for (const it of items) {
        if (Math.abs(it.y - curY) > 2) {
          flush();
          curY = it.y;
        }
        cur.push({ x: it.x, str: it.str });
      }
      flush();
    }
    return rows;
  } catch {
    return [];
  }
}

/** Valor del campo "Período Liq." leído por su fila (ej "1º SAC 2026",
 * "VACACIONES 2025", "AGOSTO PROP. 2026", "JULIO 2026"). */
function periodoLiqValue(rows: string[][]): string | null {
  for (const row of rows) {
    const i = row.findIndex((c) => /per[ií]odo\s*liq/i.test(c));
    if (i < 0) continue;
    // El valor puede ir pegado a la etiqueta (misma celda) o en la siguiente.
    const inline = row[i].replace(/^.*per[ií]odo\s*liq[a-záéíóúñ]*\.?\s*:?\s*/i, "").trim();
    const value = (inline || row[i + 1]?.trim() || "").trim();
    if (!value || /^(remun|banco|dep[oó]sito)/i.test(value)) return null;
    return value;
  }
  return null;
}

/**
 * Interpreta el valor de "Período Liq." según la regla del estudio:
 *   contiene "vacaciones"        → concepto Vacaciones, SIN fecha
 *   contiene "SAC"/"aguinaldo"/"prop" → concepto SAC, SIN fecha
 *   "<mes> <año>" (ej JULIO 2026)     → ese período
 */
function interpretarPeriodoLiq(value: string | null): {
  label: string | null;
  period: { month: number; year: number } | null;
} {
  if (!value) return { label: null, period: null };
  const v = value.toLowerCase();
  if (/vacacion/.test(v)) return { label: "Vacaciones", period: null };
  if (/\bsac\b|aguinaldo|\bprop/.test(v)) return { label: "SAC", period: null };
  const m = value.match(new RegExp(`(${MES_RE})\\s+(20\\d{2})`, "i"));
  if (m) return { label: null, period: { month: MESES[m[1].toLowerCase()], year: Number(m[2]) } };
  return { label: null, period: null };
}

/**
 * Tipo de liquidación, solo si el recibo lo indica de forma explícita
 * ("Tipo de liquidación: VACACIONES"). Es conservador a propósito: sin una
 * etiqueta clara devuelve null (se trata como sueldo mensual), para no
 * etiquetar mal un recibo normal que menciona "vacaciones" en una provisión.
 */
function findTipo(text: string): string | null {
  const etiqueta = firstMatch(text, [
    /(?:tipo|concepto|clase)\s*(?:de\s*)?liquidaci[oó]n\s*:?\s*([^\n]{3,30})/i,
  ]);
  const src = (etiqueta ?? "").toLowerCase();
  if (/vacacion/.test(src)) return "Vacaciones";
  if (/aguinaldo|s\.?\s?a\.?\s?c\.?|sueldo\s+anual/.test(src)) return "SAC";
  if (/final|indemniz|egreso|preaviso/.test(src)) return "Final";
  return null;
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
    label: findTipo(text),
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

  // El campo "Período Liq." se lee por coordenadas (su valor no queda pegado a
  // la etiqueta en el texto plano). Define el concepto y si hay fecha.
  const rows = await readPdfRows(buffer);
  const interp = interpretarPeriodoLiq(periodoLiqValue(rows));

  const cuil = fromText.cuil ?? null;
  // El contenido del PDF manda sobre el nombre del archivo.
  const legajo = fromText.legajo ?? fromName.legajo;

  const from: Detected["from"] = !legajo && !cuil ? "nada" : text ? "contenido" : "nombre";

  // Liquidación especial (vacaciones/SAC): hay concepto pero NO período.
  // Normal: período del valor "<mes> <año>", o el del texto plano como respaldo.
  const label = interp.label ?? fromText.label ?? null;
  const period = interp.label
    ? null
    : interp.period ??
      (fromText.periodMonth && fromText.periodYear
        ? { month: fromText.periodMonth, year: fromText.periodYear }
        : null);

  return {
    employerCuit: fromText.employerCuit ?? null,
    cuil,
    legajo,
    dni: fromText.dni ?? null,
    employeeName: fromText.employeeName ?? null,
    periodMonth: period?.month ?? null,
    periodYear: period?.year ?? null,
    netAmount: fromText.netAmount ?? null,
    liqNumber: fromName.liqNumber,
    label,
    from,
  };
}
