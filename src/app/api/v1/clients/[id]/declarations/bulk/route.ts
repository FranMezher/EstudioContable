import { withApi, ok, readJson, resolveApiFile } from "@/server/api/http";
import { resolveClientId, svcCreateDeclaration, ServiceError } from "@/server/services";
import type { DeclarationType } from "@/generated/prisma/enums";

type Item = {
  type: DeclarationType;
  periodYear: number;
  periodMonth?: number | null;
  notes?: string | null;
  fileUrl?: string;
  fileBase64?: string;
  fileName?: string;
};

// POST /api/v1/clients/:id/declarations/bulk  { items: [...] }
// Procesa cada item; devuelve los creados y los errores por índice.
export const POST = withApi(async ({ actor, params, req }) => {
  const clientId = resolveClientId(actor, params.id);
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
      const file = await resolveApiFile(item, { folder: "declaraciones", clientId, required: true });
      const decl = await svcCreateDeclaration(actor, {
        clientId,
        type: item.type,
        periodYear: Number(item.periodYear),
        periodMonth: item.periodMonth ?? null,
        notes: item.notes ?? null,
        fileUrl: file!.url,
        fileName: file!.fileName,
      });
      created.push(decl);
    } catch (e) {
      errors.push({ index: i, message: e instanceof Error ? e.message : "Error" });
    }
  }

  return ok({ createdCount: created.length, errorCount: errors.length, created, errors }, 207);
});
