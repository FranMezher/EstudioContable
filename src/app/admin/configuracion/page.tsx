import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SETTING_KEYS } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/admin/settings-form";

export default async function AdminConfiguracionPage() {
  const user = await requireAdmin();
  const setting = await prisma.setting.findUnique({
    where: { key: SETTING_KEYS.INQUIRY_EMAIL },
  });

  return (
    <>
      <PageHeader title="Configuración" description="Ajustes generales del sistema." />
      <SettingsForm inquiryEmail={setting?.value ?? user.email ?? ""} />
    </>
  );
}
