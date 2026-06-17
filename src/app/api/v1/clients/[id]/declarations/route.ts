import { withApi, ok, readJson, resolveApiFile } from "@/server/api/http";
import { prisma } from "@/lib/prisma";
import { resolveClientId, svcCreateDeclaration } from "@/server/services";
import type { DeclarationType } from "@/generated/prisma/enums";

// GET /api/v1/clients/:id/declarations?type=IVA&year=2026
export const GET = withApi(async ({ actor, params, req }) => {
  const clientId = resolveClientId(actor, params.id);
  const url = new URL(req.url);
  const type = url.searchParams.get("type") as DeclarationType | null;
  const year = url.searchParams.get("year");

  const rows = await prisma.declaration.findMany({
    where: {
      clientId,
      ...(type ? { type } : {}),
      ...(year ? { periodYear: Number(year) } : {}),
    },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
  });
  return ok(rows);
});

// POST /api/v1/clients/:id/declarations
export const POST = withApi(async ({ actor, params, req }) => {
  const clientId = resolveClientId(actor, params.id);
  const body = await readJson<{
    type: DeclarationType;
    periodYear: number;
    periodMonth?: number | null;
    notes?: string | null;
    fileUrl?: string;
    fileBase64?: string;
    fileName?: string;
  }>(req);

  const file = await resolveApiFile(body, { folder: "declaraciones", clientId, required: true });
  const decl = await svcCreateDeclaration(actor, {
    clientId,
    type: body.type,
    periodYear: Number(body.periodYear),
    periodMonth: body.periodMonth ?? null,
    notes: body.notes ?? null,
    fileUrl: file!.url,
    fileName: file!.fileName,
  });
  return ok(decl, 201);
});
