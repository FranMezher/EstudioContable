import { ServiceError } from "@/server/scope";
import { svcImportPayslip } from "@/server/import-service";
import { decodeBase64File, ok, readJson, withApi } from "@/server/api/http";

type ImportBody = {
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

function parse(body: ImportBody) {
  if (!body?.cuil && !body?.legajo)
    throw new ServiceError("Falta CUIL o legajo para identificar al empleado", 400);
  if (!body.fileBase64) throw new ServiceError("Falta fileBase64", 400);
  if (!body.fileName) throw new ServiceError("Falta fileName", 400);
  if (!body.sourceHash) throw new ServiceError("Falta sourceHash", 400);
  if (!body.periodMonth || !body.periodYear)
    throw new ServiceError("Falta el período (periodMonth / periodYear)", 400);

  return {
    companyRef: body.companyRef ?? null,
    employerCuit: body.employerCuit ?? null,
    cuil: body.cuil ?? null,
    legajo: body.legajo ?? null,
    dni: body.dni ?? null,
    employeeName: body.employeeName ?? null,
    periodMonth: Number(body.periodMonth),
    periodYear: Number(body.periodYear),
    netAmount: body.netAmount != null ? Number(body.netAmount) : null,
    liqNumber: body.liqNumber ?? null,
    file: decodeBase64File(body.fileBase64),
    fileName: body.fileName,
    sourceHash: body.sourceHash,
  };
}

/**
 * Alta de un recibo tomado de la carpeta mensual. Resuelve el empleado por
 * CUIL dentro de la empresa: el importador no conoce los ids internos.
 */
export const POST = withApi(async ({ actor, req }) => {
  const body = await readJson<ImportBody>(req);
  const result = await svcImportPayslip(actor, parse(body));
  return ok(result, result.status === "OK" ? 201 : 200);
});
