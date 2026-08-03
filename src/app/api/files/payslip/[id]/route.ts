import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readPrivateFile } from "@/lib/blob";
import { scopeFor, payslipWhere, scoped } from "@/server/scope";

/**
 * Única puerta de entrada a un recibo. Los archivos viven en Blob privado,
 * así que no hay URL que se pueda compartir o adivinar: cada descarga pasa
 * por acá y se valida contra el alcance del usuario.
 *
 *   GET /api/files/payslip/:id              → PDF para ver en el navegador
 *   GET /api/files/payslip/:id?download=1   → PDF como descarga
 *
 * Un recibo fuera del alcance devuelve 404, no 403: un 403 confirmaría que
 * ese recibo existe.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return new Response("No autenticado", { status: 401 });
  }

  const { id } = await ctx.params;
  const scope = scopeFor(session.user);

  const payslip = await prisma.payslip.findFirst({
    // El id viene de la URL, así que se suma AL filtro de alcance, nunca lo reemplaza.
    where: scoped(payslipWhere(scope), { id }),
    select: { filePath: true, fileName: true },
  });

  if (!payslip) {
    return new Response("No encontrado", { status: 404 });
  }

  let file;
  try {
    file = await readPrivateFile(payslip.filePath);
  } catch (e) {
    console.error("[files] no se pudo leer el recibo:", e);
    return new Response("No se pudo leer el archivo", { status: 500 });
  }

  if (!file || file.statusCode !== 200 || !file.stream) {
    return new Response("No encontrado", { status: 404 });
  }

  const download = new URL(req.url).searchParams.get("download") === "1";
  const safeName = payslip.fileName.replace(/["\\]/g, "");

  return new Response(file.stream, {
    headers: {
      "Content-Type": file.blob.contentType || "application/pdf",
      "Content-Length": String(file.blob.size),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
      // Es información sensible: que no quede en ninguna cache compartida.
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
