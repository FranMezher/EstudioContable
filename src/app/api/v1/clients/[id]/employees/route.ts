import { withApi, ok, readJson } from "@/server/api/http";
import { prisma } from "@/lib/prisma";
import { resolveClientId, svcCreateEmployee } from "@/server/services";

// GET /api/v1/clients/:id/employees
export const GET = withApi(async ({ actor, params }) => {
  const clientId = resolveClientId(actor, params.id);
  const rows = await prisma.employee.findMany({
    where: { clientId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, cuil: true, position: true, isActive: true, createdAt: true },
  });
  return ok(rows);
});

// POST /api/v1/clients/:id/employees
export const POST = withApi(async ({ actor, params, req }) => {
  const clientId = resolveClientId(actor, params.id);
  const body = await readJson<{ name: string; cuil?: string; position?: string }>(req);
  const employee = await svcCreateEmployee(actor, {
    clientId,
    name: body.name,
    cuil: body.cuil ?? null,
    position: body.position ?? null,
  });
  return ok(employee, 201);
});
