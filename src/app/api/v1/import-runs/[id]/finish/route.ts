import { svcFinishImportRun, type ImportItemInput } from "@/server/import-service";
import { ok, readJson, withApi } from "@/server/api/http";

/** Cierra la corrida y guarda el detalle archivo por archivo. */
export const POST = withApi(async ({ actor, req, params }) => {
  const body = await readJson<{ items: ImportItemInput[] }>(req);
  const run = await svcFinishImportRun(actor, params.id, body?.items ?? []);
  return ok({
    id: run.id,
    totalFiles: run.totalFiles,
    createdCount: run.createdCount,
    skippedCount: run.skippedCount,
    errorCount: run.errorCount,
  });
});
