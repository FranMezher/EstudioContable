import { withApi, ok, readJson, resolveApiFile } from "@/server/api/http";
import { prisma } from "@/lib/prisma";
import { resolveClientId, svcCreatePayslip, ServiceError } from "@/server/services";

async function clientIdForEmployee(employeeId: string) {
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { clientId: true },
  });
  if (!emp) throw new ServiceError("Empleado inexistente", 404);
  return emp.clientId;
}

// GET /api/v1/employees/:id/payslips
export const GET = withApi(async ({ actor, params }) => {
  const clientId = await clientIdForEmployee(params.id);
  resolveClientId(actor, clientId);
  const rows = await prisma.payslip.findMany({
    where: { employeeId: params.id },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
  });
  return ok(rows);
});

// POST /api/v1/employees/:id/payslips
export const POST = withApi(async ({ actor, params, req }) => {
  const clientId = await clientIdForEmployee(params.id);
  resolveClientId(actor, clientId);
  const body = await readJson<{
    periodYear: number;
    periodMonth: number;
    netAmount?: number | null;
    fileUrl?: string;
    fileBase64?: string;
    fileName?: string;
  }>(req);

  const file = await resolveApiFile(body, { folder: "recibos", clientId, required: true });
  const slip = await svcCreatePayslip(actor, {
    employeeId: params.id,
    periodYear: Number(body.periodYear),
    periodMonth: Number(body.periodMonth),
    netAmount: body.netAmount ?? null,
    fileUrl: file!.url,
    fileName: file!.fileName,
  });
  return ok(slip, 201);
});
