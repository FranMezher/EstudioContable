import { withApi, ok, readJson } from "@/server/api/http";
import { prisma } from "@/lib/prisma";
import { resolveClientId, svcCreateInquiry } from "@/server/services";

// GET /api/v1/clients/:id/inquiries
export const GET = withApi(async ({ actor, params }) => {
  const clientId = resolveClientId(actor, params.id);
  const rows = await prisma.inquiry.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  });
  return ok(rows);
});

// POST /api/v1/clients/:id/inquiries
export const POST = withApi(async ({ actor, params, req }) => {
  const clientId = resolveClientId(actor, params.id);
  const body = await readJson<{ subject: string; message: string }>(req);
  const inquiry = await svcCreateInquiry(actor, {
    clientId,
    subject: body.subject,
    message: body.message,
  });
  return ok(inquiry, 201);
});
