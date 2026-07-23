import { put, del, get } from "@vercel/blob";

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
}): string {
  const mes = String(args.periodMonth).padStart(2, "0");
  const ext = args.fileName.split(".").pop()?.toLowerCase() ?? "pdf";
  return `payslips/${args.companyId}/${args.employeeId}/${args.periodYear}-${mes}.${ext}`;
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

export async function deleteFile(pathname: string) {
  if (!token) return;
  try {
    await del(pathname, { token });
  } catch (e) {
    console.error("[blob] No se pudo borrar el archivo:", e);
  }
}
