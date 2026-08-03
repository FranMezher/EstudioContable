import { prisma } from "@/lib/prisma";
import { ok, withApi } from "@/server/api/http";

/** Prueba de conexión: dice qué alcance tiene la key. */
export const GET = withApi(async ({ actor }) => {
  if (actor.scope.kind === "studio") {
    const companies = await prisma.company.count();
    return ok({ scope: "studio", companies });
  }
  const company = await prisma.company.findUnique({
    where: { id: actor.scope.companyId },
    select: { id: true, name: true, cuit: true },
  });
  return ok({ scope: "company", company });
});
