import { put, del } from "@vercel/blob";

const token = process.env.BLOB_READ_WRITE_TOKEN;

/**
 * Sube un archivo a Vercel Blob y devuelve la URL pública.
 * El path se prefija para mantener orden por sección/cliente.
 */
export async function uploadFile(
  file: File,
  opts: { folder: string; clientId: string }
): Promise<{ url: string; fileName: string }> {
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN no configurado. Conectá Vercel Blob para poder subir archivos."
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `${opts.folder}/${opts.clientId}/${Date.now()}-${safeName}`;

  const blob = await put(pathname, file, {
    access: "public",
    token,
    addRandomSuffix: false,
  });

  return { url: blob.url, fileName: file.name };
}

export async function deleteFile(url: string) {
  if (!token) return;
  try {
    await del(url, { token });
  } catch (e) {
    console.error("[blob] No se pudo borrar el archivo:", e);
  }
}
