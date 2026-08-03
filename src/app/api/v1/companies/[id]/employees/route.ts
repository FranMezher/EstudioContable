import { getEmployees } from "@/server/queries";
import { svcCreateEmployee } from "@/server/services";
import { resolveCompanyId } from "@/server/scope";
import { ok, readJson, withApi } from "@/server/api/http";

/** Empleados de una empresa. El id se valida contra el alcance de la key. */
export const GET = withApi(async ({ actor, params }) => {
  const companyId = resolveCompanyId(actor.scope, params.id);
  return ok(await getEmployees(actor.scope, { companyId }));
});

export const POST = withApi(async ({ actor, params, req }) => {
  const body = await readJson<{ name: string; cuil: string; position?: string }>(req);
  const employee = await svcCreateEmployee(actor, { ...body, companyId: params.id });
  return ok(employee, 201);
});
