import { withApi, ok, readJson, resolveApiFile } from "@/server/api/http";
import { prisma } from "@/lib/prisma";
import { resolveClientId, svcCreateUnionItem } from "@/server/services";

// GET /api/v1/clients/:id/union-items?paid=false
export const GET = withApi(async ({ actor, params, req }) => {
  const clientId = resolveClientId(actor, params.id);
  const paid = new URL(req.url).searchParams.get("paid");
  const rows = await prisma.unionItem.findMany({
    where: { clientId, ...(paid === null ? {} : { isPaid: paid === "true" }) },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
  });
  return ok(rows);
});

// POST /api/v1/clients/:id/union-items
export const POST = withApi(async ({ actor, params, req }) => {
  const clientId = resolveClientId(actor, params.id);
  const body = await readJson<{
    title: string;
    description?: string | null;
    periodYear: number;
    periodMonth?: number | null;
    amount?: number | null;
    fileUrl?: string;
    fileBase64?: string;
    fileName?: string;
  }>(req);

  const file = await resolveApiFile(body, { folder: "sindicatos", clientId, required: false });
  const item = await svcCreateUnionItem(actor, {
    clientId,
    title: body.title,
    description: body.description ?? null,
    periodYear: Number(body.periodYear),
    periodMonth: body.periodMonth ?? null,
    amount: body.amount ?? null,
    fileUrl: file?.url ?? null,
    fileName: file?.fileName ?? null,
  });
  return ok(item, 201);
});
