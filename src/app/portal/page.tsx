import Link from "next/link";
import { requireClient } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Landmark, Receipt, MessageSquare, ArrowRight } from "lucide-react";

export default async function PortalHome() {
  const user = await requireClient();
  const clientId = user.clientId;

  const [declarations, unionPending, payslips, openInquiries, client] = await Promise.all([
    prisma.declaration.count({ where: { clientId } }),
    prisma.unionItem.count({ where: { clientId, isPaid: false } }),
    prisma.payslip.count({ where: { employee: { clientId } } }),
    prisma.inquiry.count({ where: { clientId, status: "OPEN" } }),
    prisma.client.findUnique({ where: { id: clientId }, select: { name: true } }),
  ]);

  const cards = [
    { href: "/portal/declaraciones", label: "Declaraciones", value: declarations, icon: FileText, tone: "text-brand-600 bg-brand-50" },
    { href: "/portal/sindicatos", label: "Sindicatos pendientes", value: unionPending, icon: Landmark, tone: "text-amber-600 bg-amber-50" },
    { href: "/portal/recibos", label: "Recibos cargados", value: payslips, icon: Receipt, tone: "text-emerald-600 bg-emerald-50" },
    { href: "/portal/consultas", label: "Consultas abiertas", value: openInquiries, icon: MessageSquare, tone: "text-violet-600 bg-violet-50" },
  ];

  return (
    <>
      <PageHeader
        title={`Hola, ${user.name?.split(" ")[0] ?? ""}`}
        description={`${client?.name ?? ""} · Resumen de tu cuenta`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.href} href={c.href}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent>
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${c.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{c.value}</p>
                  <p className="text-sm text-slate-500">{c.label}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardContent>
          <h3 className="mb-3 font-semibold text-slate-800">Accesos rápidos</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {cards.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {c.label}
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
