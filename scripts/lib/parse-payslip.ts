import path from "node:path";
import { extractText, getDocumentProxy } from "unpdf";

/**
 * Reglas para deducir a quién corresponde cada PDF.
 *
 * Estrategia: primero el nombre del archivo y de la carpeta, que es rápido y
 * no falla; si eso no alcanza, se abre el PDF y se busca el CUIL en el texto.
 * Si el PDF es un escaneo sin texto, el archivo queda pendiente — nunca se
 * asigna "por aproximación".
 */

const MESES_TEXTO: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

export type Detected = {
  cuil: string | null;
  periodMonth: number | null;
  periodYear: number | null;
  employeeName: string | null;
  netAmount: number | null;
  /** De dónde salió cada dato, para el informe. */
  from: "nombre" | "contenido" | "mixto" | "nada";
};

/** Busca 11 dígitos consecutivos, tolerando guiones y puntos. */
export function findCuil(text: string): string | null {
  const limpio = text.replace(/[.\-\s]/g, "");
  const m = limpio.match(/(2[0347]|3[034]|23|27)\d{9}/);
  if (m) return m[0];
  const suelto = limpio.match(/\d{11}/);
  return suelto ? suelto[0] : null;
}

/** Reconoce YYYY-MM, MM-YYYY, YYYYMM y "Junio 2026". */
export function findPeriod(text: string): { month: number; year: number } | null {
  const norm = text.toLowerCase();

  const nombreMes = norm.match(
    /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\D{0,10}(20\d{2})/
  );
  if (nombreMes) {
    return { month: MESES_TEXTO[nombreMes[1]], year: Number(nombreMes[2]) };
  }

  const isoLike = norm.match(/(20\d{2})[-_./](0?[1-9]|1[0-2])(?!\d)/);
  if (isoLike) return { month: Number(isoLike[2]), year: Number(isoLike[1]) };

  const mesAnio = norm.match(/(?<!\d)(0?[1-9]|1[0-2])[-_./](20\d{2})(?!\d)/);
  if (mesAnio) return { month: Number(mesAnio[1]), year: Number(mesAnio[2]) };

  const compacto = norm.match(/(?<!\d)(20\d{2})(0[1-9]|1[0-2])(?!\d)/);
  if (compacto) return { month: Number(compacto[2]), year: Number(compacto[1]) };

  return null;
}

/** Neto del recibo, si aparece etiquetado en el texto. */
function findNet(text: string): number | null {
  const m = text
    .toLowerCase()
    .match(/(neto|l[íi]quido)[^\d\n]{0,40}?\$?\s*([\d.]+,\d{2}|\d+\.\d{2})/);
  if (!m) return null;
  const raw = m[2];
  // Formato argentino: 1.234.567,89
  const n = raw.includes(",") ? Number(raw.replace(/\./g, "").replace(",", ".")) : Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Nombre del empleado, para dar de alta si el CUIL es nuevo. */
function findName(text: string): string | null {
  const m = text.match(
    /(?:apellido\s*y\s*nombres?|nombre\s*y\s*apellido|empleado)\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ' ]{4,60})/
  );
  return m ? m[1].trim().replace(/\s+/g, " ") : null;
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

/**
 * Deduce los datos de un recibo. `filePath` se usa para leer el nombre del
 * archivo y de su carpeta.
 */
export async function detectPayslip(filePath: string, buffer: Buffer): Promise<Detected> {
  const fileName = path.basename(filePath);
  const folder = path.basename(path.dirname(filePath));
  const desdeNombre = `${folder} ${fileName}`;

  let cuil = findCuil(fileName);
  let periodo = findPeriod(fileName) ?? findPeriod(desdeNombre);
  let employeeName: string | null = null;
  let netAmount: number | null = null;
  let usoContenido = false;

  // Solo se abre el PDF si el nombre no alcanzó: leerlo es lo caro.
  if (!cuil || !periodo) {
    const texto = await readPdfText(buffer);
    if (texto) {
      usoContenido = true;
      cuil = cuil ?? findCuil(texto);
      periodo = periodo ?? findPeriod(texto);
      employeeName = findName(texto);
      netAmount = findNet(texto);
    }
  }

  const from: Detected["from"] = !cuil && !periodo ? "nada" : usoContenido ? "mixto" : "nombre";

  return {
    cuil,
    periodMonth: periodo?.month ?? null,
    periodYear: periodo?.year ?? null,
    employeeName,
    netAmount,
    from: from === "mixto" && !findCuil(fileName) ? "contenido" : from,
  };
}
