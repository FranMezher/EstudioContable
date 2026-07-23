import { getCompanies } from "@/server/queries";
import { svcCreateCompany } from "@/server/services";
import { ok, readJson, withApi } from "@/server/api/http";

/** Empresas visibles para la key. */
export const GET = withApi(async ({ actor, req }) => {
  const search = new URL(req.url).searchParams.get("q") ?? undefined;
  return ok(await getCompanies(actor.scope, search));
});

/** Alta de empresa. Solo con una key de acceso total. */
export const POST = withApi(async ({ actor, req }) => {
  const body = await readJson<{ name: string; cuit?: string; email?: string; phone?: string }>(req);
  const company = await svcCreateCompany(actor, body);
  return ok(company, 201);
});
