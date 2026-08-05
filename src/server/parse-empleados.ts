import { getDocumentProxy } from "unpdf";
import ExcelJS from "exceljs";

/**
 * Lee un listado de empleados (PDF, Excel .xlsx o CSV) y extrae, por persona:
 * legajo/código, nombre, CUIL y DNI. Está pensado para los listados que exporta
 * el sistema de sueldos (una fila por empleado). No decide la empresa: eso lo
 * elige el estudio al subir el archivo.
 */
export type ParsedEmployee = {
  legajo: string | null;
  name: string;
  cuil: string;
  dni: string | null;
};

const CUIL_RE = /(\d{2}-?\d{8}-?\d)/;

/** Extrae un empleado de una línea de texto que contenga un CUIL. */
function parseLine(line: string): ParsedEmployee | null {
  const m = line.match(CUIL_RE);
  if (!m || m.index === undefined) return null;
  const cuil = m[1];

  const before = line.slice(0, m.index).trim();
  const after = line.slice(m.index + m[0].length);

  // El legajo/código suele ser el número al principio de la fila.
  const leg = before.match(/^(\d{1,6})\s+(.+)$/);
  const legajo = leg ? leg[1] : null;
  const name = (leg ? leg[2] : before).replace(/\s+/g, " ").trim();
  if (name.length < 3) return null;

  // DNI: preferentemente el que sigue a "DNI"; si no, un número suelto de 7-9.
  const dni =
    after.match(/DNI\s*[:.]?\s*(\d{6,9})/i)?.[1] ?? after.match(/\b(\d{7,9})\b/)?.[1] ?? null;

  return { legajo, name, cuil, dni };
}

type PdfTextItem = { str?: string; transform?: number[] };

/**
 * Reconstruye las filas visuales del PDF por posición (coordenadas de cada
 * fragmento de texto). El texto "plano" de un PDF no respeta la tabla: mezcla
 * columnas. Acá agrupamos por Y (misma fila) y ordenamos por X (izq→der).
 */
async function pdfRows(buffer: Buffer): Promise<string[][]> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const rows: string[][] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = (content.items as PdfTextItem[])
      .filter((it) => typeof it.str === "string" && it.str.trim().length > 0 && it.transform)
      .map((it) => ({ x: it.transform![4], y: it.transform![5], str: it.str! }));

    // Arriba→abajo (Y desc), y dentro de la fila izquierda→derecha (X asc).
    items.sort((a, b) => b.y - a.y || a.x - b.x);

    let curY = Infinity;
    let cur: { x: number; str: string }[] = [];
    const flush = () => {
      if (cur.length) rows.push(cur.sort((a, b) => a.x - b.x).map((c) => c.str));
      cur = [];
    };
    for (const it of items) {
      // Nueva fila si el Y cambia más que la tolerancia (misma línea ≈ mismo Y).
      if (Math.abs(it.y - curY) > 2) {
        flush();
        curY = it.y;
      }
      cur.push({ x: it.x, str: it.str });
    }
    flush();
  }
  return rows;
}

async function parsePdf(buffer: Buffer): Promise<ParsedEmployee[]> {
  let rows: string[][];
  try {
    rows = await pdfRows(buffer);
  } catch {
    return [];
  }
  const out: ParsedEmployee[] = [];
  for (const cells of rows) {
    const p = parseLine(cells.join(" ").replace(/\s+/g, " ").trim());
    if (p) out.push(p);
  }
  return out;
}

/** Filas (planilla) → empleados. Usa el encabezado si lo reconoce; si no, escanea. */
function parseRows(rows: string[][]): ParsedEmployee[] {
  const headerIdx = rows.findIndex((r) =>
    r.some((c) => /c\.?\s*u\.?\s*i\.?\s*l/i.test(c) || /cuil/i.test(c))
  );

  if (headerIdx >= 0) {
    const header = rows[headerIdx].map((c) => c.toLowerCase());
    const find = (...keys: string[]) =>
      header.findIndex((h) => keys.some((k) => h.includes(k)));
    const iCuil = find("cuil", "c.u.i.l");
    const iName = find("apellido", "nombre");
    const iLeg = find("legajo", "codigo", "código", "cod.", "cod ");
    const iDni = find("dni", "documento", "doc");

    const out: ParsedEmployee[] = [];
    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      const cuil = (iCuil >= 0 ? row[iCuil] ?? "" : "").match(CUIL_RE)?.[1];
      const name = (iName >= 0 ? row[iName] ?? "" : "").replace(/\s+/g, " ").trim();
      if (!cuil || name.length < 3) continue;
      const legajo = iLeg >= 0 ? (row[iLeg] ?? "").trim() || null : null;
      const dni = iDni >= 0 ? (row[iDni] ?? "").match(/\d{6,9}/)?.[0] ?? null : null;
      out.push({ legajo, name, cuil, dni });
    }
    if (out.length > 0) return out;
  }

  // Sin encabezado reconocible: cada fila se trata como una línea de texto.
  const out: ParsedEmployee[] = [];
  for (const row of rows) {
    const p = parseLine(row.join(" ").replace(/\s+/g, " ").trim());
    if (p) out.push(p);
  }
  return out;
}

async function parseExcel(buffer: Buffer): Promise<ParsedEmployee[]> {
  const wb = new ExcelJS.Workbook();
  try {
    // exceljs espera un ArrayBuffer; tomamos exactamente los bytes del archivo.
    const ab = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer;
    await wb.xlsx.load(ab);
  } catch {
    return [];
  }
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const rows: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cells[col - 1] = String(cell.text ?? "").trim();
    });
    rows.push(cells.map((c) => c ?? ""));
  });
  return parseRows(rows);
}

function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function parseCsv(buffer: Buffer): ParsedEmployee[] {
  const text = buffer.toString("utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  // Delimitador: ';' si predomina (común en Excel AR), si no ','.
  const first = lines[0];
  const delim = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows = lines.map((l) => splitCsvLine(l, delim));
  return parseRows(rows);
}

/** Punto de entrada: elige el parser según la extensión / contenido. */
export async function parseEmployeesFile(
  buffer: Buffer,
  fileName: string
): Promise<ParsedEmployee[]> {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  if (ext === "pdf") return parsePdf(buffer);
  if (ext === "xlsx" || ext === "xlsm") return parseExcel(buffer);
  if (ext === "csv" || ext === "txt") return parseCsv(buffer);
  // Sin extensión clara: por firma de archivo.
  if (buffer.subarray(0, 4).toString("latin1") === "%PDF") return parsePdf(buffer);
  if (buffer.subarray(0, 2).toString("latin1") === "PK") return parseExcel(buffer);
  return parseCsv(buffer);
}
