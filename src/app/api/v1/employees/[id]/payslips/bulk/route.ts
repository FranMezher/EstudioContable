import { withApi, ok, readJson, resolveApiFile } from "@/server/api/http";
import { prisma } from "@/lib/prisma";
import { resolveClientId, svcCreatePayslip, ServiceError } from "@/server/services";

type Item = {
  periodYear: number;
  periodMonth: number;
  netAmount?: number | null;
  fileUrl?: string;
  fileBase64?: string;
  fileName?: string;
};

// POST /api/v1/employees/:id/payslips/bulk  { items: [...] }
export const POST = withApi(async ({ actor, params, req }) => {
  const emp = await prisma.employee.findUnique({
    where: { id: params.id },
    select: { clientId: true },
  });
  if (!emp) throw new ServiceError("Empleado inexistente", 404);
  const clientId = resolveClientId(actor, emp.clientId);

  const body = await readJson<{ items?: Item[] }>(req);
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new ServiceError("Enviá un array 'items' con al menos un elemento", 400);
  }
  if (body.items.length > 200) throw new ServiceError("Máximo 200 items por lote", 400);

  const created: unknown[] = [];
  const errors: { index: number; message: string }[] = [];

  for (let i = 0; i < body.items.length; i++) {
    const item = body.items[i];
    try {
      const file = await resolveApiFile(item, { folder: "recibos", clientId, required: true });
      const slip = await svcCreatePayslip(actor, {
        employeeId: params.id,
        periodYear: Number(item.periodYear),
        periodMonth: Number(item.periodMonth),
        netAmount: item.netAmount ?? null,
        fileUrl: file!.url,
        fileName: file!.fileName,
      });
      created.push(slip);
    } catch (e) {
      errors.push({ index: i, message: e instanceof Error ? e.message : "Error" });
    }
  }

  return ok({ createdCount: created.length, errorCount: errors.length, created, errors }, 207);
});
