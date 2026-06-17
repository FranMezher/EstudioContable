import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, Landmark, FileText, ArrowRight } from "lucide-react";

export default async function AdminHome() {
  const user = await requireAdmin();

  const [clients, openInquiries, unionPending, declarations, recentInquiries] = await Promise.all([
    prisma.client.count(),
    prisma.inquiry.count({ where: { status: "OPEN" } }),
    prisma.unionItem.count({ where: { isPaid: false } }),
    prisma.declaration.count(),
    prisma.inquiry.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { client: { select: { name: true } } },
    }),
  ]);

  const stats = [
    { href: "/admin/clientes", label: "Clientes", value: clients, icon: Users, tone: "text-brand-600 bg-brand-50" },
    { href: "/admin/consultas", label: "Consultas sin responder", value: openInquiries, icon: MessageSquare, tone: "text-violet-600 bg-violet-50" },
    { href: "/admin/clientes", label: "Sindicatos pendientes", value: unionPending, icon: Landmark, tone: "text-amber-600 bg-amber-50" },
    { href: "/admin/clientes", label: "Declaraciones cargadas", value: declarations, icon: FileText, tone: "text-emerald-600 bg-emerald-50" },
  ];

  return (
    <>
      <PageHeader
        title={`Bienvenido, ${user.name?.split(" ")[0] ?? ""}`}
        description="Panel general del estudio."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent>
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${s.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                  <p className="text-sm text-slate-500">{s.label}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Consultas recientes sin responder</h3>
            <Link href="/admin/consultas" className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
              Ver todas <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {recentInquiries.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No hay consultas pendientes 🎉</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentInquiries.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{i.subject}</p>
                    <p className="truncate text-xs text-slate-500">{i.client.name}</p>
                  </div>
                  <Badge tone="warning">Pendiente</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
