import { withApi, ok } from "@/server/api/http";
import { prisma } from "@/lib/prisma";

// GET /api/v1/me — info del scope de la API key (útil para probar la conexión)
export const GET = withApi(async ({ actor }) => {
  const client = actor.clientId
    ? await prisma.client.findUnique({
        where: { id: actor.clientId },
        select: { id: true, name: true },
      })
    : null;

  return ok({
    scope: actor.role === "ADMIN" ? "full" : "client",
    role: actor.role,
    clientId: actor.clientId,
    client,
  });
});
