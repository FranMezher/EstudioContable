import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { getPaymentRows } from "@/server/queries";
import { scopeFor } from "@/server/scope";
import { periodoLabel } from "@/lib/constants";

/**
 * Descarga la tabla de pagos en Excel, respetando el alcance (un admin de
 * empresa solo baja los suyos). Incluye la columna "Pagado" (Sí/No).
 *
 *   GET /api/files/pagos-excel?companyId=&year=2026&months=4,6
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

  const data = await getPaymentRows(scope, { companyId, year, months });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Mezher Pampin";
  const ws = wb.addWorksheet("Pagos");

  ws.columns = [
    { header: "Empleado", key: "empleado", width: 34 },
    { header: "Legajo", key: "legajo", width: 10 },
    { header: "Concepto", key: "concepto", width: 14 },
    { header: "Período", key: "periodo", width: 16 },
    { header: "Liquidación", key: "liq", width: 13 },
    { header: "Monto neto", key: "monto", width: 16 },
    { header: "Pagado", key: "pagado", width: 10 },
  ];

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
  header.alignment = { vertical: "middle" };

  for (const r of data.items) {
    ws.addRow({
      empleado: r.employeeName,
      legajo: r.legajo ?? "",
      concepto: r.label ?? "Sueldo",
      periodo: periodoLabel(r.periodMonth, r.periodYear),
      liq: r.liqNumber ?? "",
      monto: r.netAmount ?? null,
      pagado: r.paid ? "Sí" : "No",
    });
  }

  ws.getColumn("monto").numFmt = "#,##0.00";
  ws.autoFilter = { from: "A1", to: `G${data.items.length + 1}` };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  // Fila de total.
  const totalRow = ws.addRow({ empleado: "TOTAL", monto: data.total });
  totalRow.font = { bold: true };
  totalRow.getCell("monto").numFmt = "#,##0.00";

  const buf = await wb.xlsx.writeBuffer();
  const nombre = `pagos-${year}${months && months.length ? "-" + months.join("_") : ""}.xlsx`;

  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
