import { svcStartImportRun } from "@/server/import-service";
import { ok, readJson, withApi } from "@/server/api/http";

/** Abre una corrida del importador para dejar registro en el panel. */
export const POST = withApi(async ({ actor, req }) => {
  const body = await readJson<{ sourceLabel: string; isDryRun?: boolean; companyId?: string }>(req);
  const run = await svcStartImportRun(actor, {
    sourceLabel: body?.sourceLabel ?? "Importación",
    isDryRun: body?.isDryRun,
    companyId: body?.companyId ?? null,
  });
  return ok({ id: run.id }, 201);
});
