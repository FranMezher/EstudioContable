import { requireClient } from "@/lib/session";
import { getInquiries } from "@/server/queries";
import { PageHeader } from "@/components/page-header";
import { InquiriesPortal } from "@/components/sections/inquiries-portal";

export default async function PortalConsultasPage() {
  const user = await requireClient();
  const inquiries = await getInquiries(user.clientId);

  return (
    <>
      <PageHeader
        title="Consultas"
        description="Enviá tus consultas al estudio y seguí las respuestas."
      />
      <InquiriesPortal inquiries={inquiries} />
    </>
  );
}
