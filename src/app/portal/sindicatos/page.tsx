import { requireClient } from "@/lib/session";
import { getUnionItems } from "@/server/queries";
import { PageHeader } from "@/components/page-header";
import { UnionSection } from "@/components/sections/union-section";

export default async function PortalSindicatosPage() {
  const user = await requireClient();
  const items = await getUnionItems(user.clientId);

  return (
    <>
      <PageHeader
        title="Sindicatos"
        description="Revisá los aportes y marcá OK cuando los pagues."
      />
      <UnionSection items={items} />
    </>
  );
}
