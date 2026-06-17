import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  getDeclarations,
  getUnionItems,
  getEmployees,
  getInquiries,
} from "@/server/queries";
import { PageHeader } from "@/components/page-header";
import { ClientTabs } from "@/components/admin/client-tabs";
import { ArrowLeft } from "lucide-react";

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      users: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, isActive: true } },
    },
  });
  if (!client) notFound();

  const [declarations, unionItems, employees, inquiries] = await Promise.all([
    getDeclarations(id),
    getUnionItems(id),
    getEmployees(id),
    getInquiries(id),
  ]);

  return (
    <>
      <Link
        href="/admin/clientes"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a clientes
      </Link>
      <PageHeader
        title={client.name}
        description={[client.cuit && `CUIT ${client.cuit}`, client.email, client.phone]
          .filter(Boolean)
          .join(" · ")}
      />
      <ClientTabs
        clientId={id}
        declarations={declarations}
        unionItems={unionItems}
        employees={employees}
        inquiries={inquiries}
        users={client.users}
      />
    </>
  );
}
