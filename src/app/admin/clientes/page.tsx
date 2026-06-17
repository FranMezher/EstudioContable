import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NewClientForm } from "@/components/admin/new-client-form";
import { Users, ChevronRight } from "lucide-react";

export default async function AdminClientesPage() {
  await requireAdmin();

  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { users: true, declarations: true, employees: true } },
      unionItems: { where: { isPaid: false }, select: { id: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Gestioná los clientes del estudio y sus accesos."
        action={<NewClientForm />}
      />

      {clients.length === 0 ? (
        <EmptyState
          title="Todavía no hay clientes"
          description='Creá el primero con el botón "Nuevo cliente".'
          icon={Users}
        />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {clients.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/clientes/${c.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 font-semibold text-brand-700">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">{c.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {c.cuit ? `CUIT ${c.cuit} · ` : ""}
                        {c._count.users} acceso(s) · {c._count.declarations} declaraciones ·{" "}
                        {c._count.employees} empleados
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {c.unionItems.length > 0 && (
                      <Badge tone="warning">{c.unionItems.length} sind. pend.</Badge>
                    )}
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
