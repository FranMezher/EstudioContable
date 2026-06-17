import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { AdminInquiries } from "@/components/admin/admin-inquiries";

export default async function AdminConsultasPage() {
  await requireAdmin();

  const rows = await prisma.inquiry.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { client: { select: { name: true } } },
  });

  const inquiries = rows.map((i) => ({
    id: i.id,
    subject: i.subject,
    message: i.message,
    status: i.status,
    response: i.response,
    respondedAt: i.respondedAt ? i.respondedAt.toISOString() : null,
    createdAt: i.createdAt.toISOString(),
    clientName: i.client.name,
  }));

  return (
    <>
      <PageHeader
        title="Consultas"
        description="Consultas recibidas de todos los clientes. Respondé y se les notifica."
      />
      <AdminInquiries inquiries={inquiries} />
    </>
  );
}
