import { withApi, ok } from "@/server/api/http";
import { prisma } from "@/lib/prisma";
import { resolveClientId, ServiceError } from "@/server/services";

// GET /api/v1/clients/:id — detalle de un cliente
export const GET = withApi(async ({ actor, params }) => {
  const clientId = resolveClientId(actor, params.id);
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      cuit: true,
      email: true,
      phone: true,
      createdAt: true,
      _count: { select: { declarations: true, unionItems: true, employees: true, inquiries: true } },
    },
  });
  if (!client) throw new ServiceError("Cliente inexistente", 404);
  return ok(client);
});
