import { ServiceError } from "@/server/scope";
import { svcImportPayslip } from "@/server/import-service";
import { decodeBase64File, ok, readJson, withApi } from "@/server/api/http";

const MAX_ITEMS = 50;

type Item = {
  companyRef?: string;
  employerCuit?: string;
  cuil?: string;
  legajo?: string;
  dni?: string;
  employeeName?: string;
  periodMonth: number;
  periodYear: number;
  netAmount?: number;
  liqNumber?: string;
  fileBase64: string;
  fileName: string;
  sourceHash: string;
};

/**
 * Carga de a lotes. Un archivo que falla no frena a los demás: cada uno
 * informa su resultado y el importador lo registra en la corrida.
 */
export const POST = withApi(async ({ actor, req }) => {
  const body = await readJson<{ items: Item[] }>(req);
  const items = body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    throw new ServiceError("Mandá un array 'items' con al menos un recibo", 400);
  }
  if (items.length > MAX_ITEMS) {
    throw new ServiceError(`El lote no puede tener más de ${MAX_ITEMS} recibos`, 400);
  }

  const results: Array<{
    index: number;
    fileName: string;
    status: string;
    message?: string;
    payslipId?: string;
    employeeId?: string;
    employeeCreated?: boolean;
  }> = [];

  for (const [index, item] of items.entries()) {
    try {
      const res = await svcImportPayslip(actor, {
        companyRef: item.companyRef ?? null,
        employerCuit: item.employerCuit ?? null,
        cuil: item.cuil ?? null,
        legajo: item.legajo ?? null,
        dni: item.dni ?? null,
        employeeName: item.employeeName ?? null,
        periodMonth: Number(item.periodMonth),
        periodYear: Number(item.periodYear),
        netAmount: item.netAmount != null ? Number(item.netAmount) : null,
        liqNumber: item.liqNumber ?? null,
        file: decodeBase64File(item.fileBase64),
        fileName: item.fileName,
        sourceHash: item.sourceHash,
      });
      results.push({ index, fileName: item.fileName, ...res });
    } catch (e) {
      results.push({
        index,
        fileName: item.fileName ?? `(item ${index})`,
        status: e instanceof ServiceError && e.status === 404 ? "SIN_EMPLEADO" : "ERROR",
        message: e instanceof Error ? e.message : "Error desconocido",
      });
    }
  }

  const createdCount = results.filter((r) => r.status === "OK").length;
  const skippedCount = results.filter((r) => r.status === "DUPLICADO").length;

  return ok(
    {
      createdCount,
      skippedCount,
      errorCount: results.length - createdCount - skippedCount,
      results,
    },
    207
  );
});
