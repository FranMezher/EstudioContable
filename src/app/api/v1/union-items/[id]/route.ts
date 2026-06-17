import { withApi, ok, readJson } from "@/server/api/http";
import { svcSetUnionPaid, svcDeleteUnionItem } from "@/server/services";

// PATCH /api/v1/union-items/:id   { isPaid: true|false }
export const PATCH = withApi(async ({ actor, params, req }) => {
  const body = await readJson<{ isPaid?: boolean }>(req);
  const updated = await svcSetUnionPaid(actor, params.id, body.isPaid !== false);
  return ok(updated);
});

// DELETE /api/v1/union-items/:id
export const DELETE = withApi(async ({ actor, params }) => {
  await svcDeleteUnionItem(actor, params.id);
  return ok({ deleted: true });
});
