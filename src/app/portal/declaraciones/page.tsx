import { requireClient } from "@/lib/session";
import { getDeclarations } from "@/server/queries";
import { PageHeader } from "@/components/page-header";
import { DeclarationsSection } from "@/components/sections/declarations-section";

export default async function PortalDeclaracionesPage() {
  const user = await requireClient();
  const declarations = await getDeclarations(user.clientId);

  return (
    <>
      <PageHeader
        title="Declaraciones Juradas"
        description="IVA, Ingresos Brutos, Ganancias y Balances. Podés ver, descargar y subir documentación."
      />
      <DeclarationsSection declarations={declarations} />
    </>
  );
}
