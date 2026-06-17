import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SETTING_KEYS } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { ApiKeysManager, type ApiKeyRow } from "@/components/admin/api-keys-manager";

export default async function AdminConfiguracionPage() {
  const user = await requireAdmin();

  const [setting, clients, keys] = await Promise.all([
    prisma.setting.findUnique({ where: { key: SETTING_KEYS.INQUIRY_EMAIL } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      include: { client: { select: { name: true } } },
    }),
  ]);

  const keyRows: ApiKeyRow[] = keys.map((k) => ({
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    scopeLabel: k.client ? `Solo ${k.client.name}` : "Acceso total",
    isActive: k.isActive,
    lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
    createdAt: k.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader title="Configuración" description="Ajustes generales del sistema y acceso por API." />
      <div className="space-y-6">
        <SettingsForm inquiryEmail={setting?.value ?? user.email ?? ""} />
        <ApiKeysManager clients={clients} keys={keyRows} />
      </div>
    </>
  );
}
