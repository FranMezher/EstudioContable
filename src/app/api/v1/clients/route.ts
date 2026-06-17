import { withApi, ok, readJson } from "@/server/api/http";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/server/services";

// GET /api/v1/clients — lista de clientes (admin: todos; key de cliente: solo el suyo)
export const GET = withApi(async ({ actor }) => {
  const clients = await prisma.client.findMany({
    where: actor.role === "ADMIN" ? {} : { id: actor.clientId ?? "" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, cuit: true, email: true, phone: true, createdAt: true },
  });
  return ok(clients);
});

// POST /api/v1/clients — crear cliente (solo keys con acceso total)
export const POST = withApi(async ({ actor, req }) => {
  if (actor.role !== "ADMIN") throw new ServiceError("Solo keys con acceso total pueden crear clientes", 403);
  const body = await readJson<{ name?: string; cuit?: string; email?: string; phone?: string }>(req);
  if (!body.name?.trim()) throw new ServiceError("Falta 'name'", 400);

  const client = await prisma.client.create({
    data: {
      name: body.name.trim(),
      cuit: body.cuit ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
    },
    select: { id: true, name: true, cuit: true, email: true, phone: true, createdAt: true },
  });
  return ok(client, 201);
});
