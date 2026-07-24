import { put, del, get, list } from "@vercel/blob";

const token = process.env.BLOB_READ_WRITE_TOKEN;

function requireToken() {
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN no configurado. Conectá Vercel Blob para poder subir archivos."
    );
  }
  return token;
}

/**
 * Los recibos se guardan en Blob PRIVADO. Nunca se expone la URL del blob:
 * el único camino para leer un recibo es /api/files/payslip/[id], que valida
 * sesión y alcance en cada pedido. Por eso se guarda el pathname, no una URL.
 */
export function payslipPath(args: {
  companyId: string;
  employeeId: string;
  periodYear: number;
  periodMonth: number;
  fileName: string;
  /** Distingue recibos del mismo mes (nº de liquidación o timestamp). */
  discriminator: string;
}): string {
  const mes = String(args.periodMonth).padStart(2, "0");
  const ext = args.fileName.split(".").pop()?.toLowerCase() ?? "pdf";
  const disc = args.discriminator.replace(/[^a-zA-Z0-9_-]/g, "") || String(Date.now());
  return `payslips/${args.companyId}/${args.employeeId}/${args.periodYear}-${mes}-${disc}.${ext}`;
}

/** Sube un recibo y devuelve su pathname (no una URL pública). */
export async function uploadPayslipFile(
  data: Buffer | File,
  pathname: string
): Promise<{ path: string; size: number }> {
  const blob = await put(pathname, data, {
    access: "private",
    token: requireToken(),
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/pdf",
  });
  const size = data instanceof File ? data.size : data.byteLength;
  return { path: blob.pathname, size };
}

/** Abre un archivo privado para servirlo desde una ruta autenticada. */
export async function readPrivateFile(pathname: string) {
  return get(pathname, { access: "private", token: requireToken() });
}

/** Borra un archivo. Devuelve false si no se pudo (no corta la operación). */
export async function deleteFile(pathname: string): Promise<boolean> {
  if (!token) return false;
  try {
    await del(pathname, { token });
    return true;
  } catch (e) {
    console.error("[blob] No se pudo borrar el archivo:", e instanceof Error ? e.message : e);
    return false;
  }
}

/** Verifica que el token sirva y el store exista, antes de operar en lote. */
export async function checkBlobAccess(): Promise<{ ok: boolean; error?: string }> {
  try {
    await list({ token: requireToken(), limit: 1 });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Todos los pathnames guardados bajo un prefijo (para detectar huérfanos). */
export async function listAllFiles(prefix = "payslips/"): Promise<string[]> {
  const out: string[] = [];
  let cursor: string | undefined;
  do {
    const res = await list({ token: requireToken(), prefix, cursor, limit: 1000 });
    out.push(...res.blobs.map((b) => b.pathname));
    cursor = res.hasMore ? res.cursor : undefined;
  } while (cursor);
  return out;
}
