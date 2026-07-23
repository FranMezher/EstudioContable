import JSZip from "jszip";
import { auth } from "@/auth";
import { readPrivateFile } from "@/lib/blob";
import { getPayslipsForZip } from "@/server/queries";
import { scopeFor } from "@/server/scope";
import { MESES } from "@/lib/constants";

/**
 * Descarga en un solo ZIP todos los recibos que entran en el filtro, respetando
 * el alcance del usuario (un admin de empresa solo baja los de su empresa).
 *
 *   GET /api/files/payslips-zip?companyId=&year=2026&months=4,6
 *
 * `months` es una lista separada por comas; vacío o ausente = todos los meses.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("No autenticado", { status: 401 });

  const scope = scopeFor(session.user);
  if (scope.kind === "employee") return new Response("No autorizado", { status: 403 });

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year"));
  if (!year) return new Response("Falta el año", { status: 400 });

  const companyId = url.searchParams.get("companyId") ?? undefined;
  const monthsParam = url.searchParams.get("months")?.trim();
  const months = monthsParam
    ? monthsParam.split(",").map((m) => Number(m)).filter((m) => m >= 1 && m <= 12)
    : undefined;

  // getPayslipsForZip filtra por alcance: un id ajeno no devuelve nada.
  const payslips = await getPayslipsForZip(scope, { companyId, year, months });
  if (payslips.length === 0) {
    return new Response("No hay recibos para ese filtro", { status: 404 });
  }

  const zip = new JSZip();
  const usados = new Map<string, number>();

  // Se traen los archivos de a tandas para no saturar memoria ni conexiones.
  const BATCH = 8;
  for (let i = 0; i < payslips.length; i += BATCH) {
    const tanda = payslips.slice(i, i + BATCH);
    await Promise.all(
      tanda.map(async (p) => {
        const file = await readPrivateFile(p.filePath).catch(() => null);
        if (!file || file.statusCode !== 200 || !file.stream) return;
        const buffer = Buffer.from(await new Response(file.stream).arrayBuffer());

        const carpeta = sanitize(p.employee.name || p.employee.legajo || "empleado");
        const mes = String(p.periodMonth).padStart(2, "0");
        const liq = p.liqNumber ? `-Liq${p.liqNumber}` : "";
        let nombre = `${carpeta}/${p.periodYear}-${mes} ${MESES[p.periodMonth - 1]}${liq}.pdf`;

        // Evita colisiones de nombre dentro del zip.
        const prev = usados.get(nombre) ?? 0;
        if (prev > 0) nombre = nombre.replace(/\.pdf$/, `-${prev + 1}.pdf`);
        usados.set(nombre, prev + 1);

        zip.file(nombre, buffer);
      })
    );
  }

  const content = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
  const nombreZip = `recibos-${year}${months && months.length ? "-" + months.join("_") : ""}.zip`;

  return new Response(content, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${nombreZip}"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ _.-]/g, "").trim() || "empleado";
}
