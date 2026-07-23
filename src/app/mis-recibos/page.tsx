import { Receipt } from "lucide-react";
import { requireEmployee } from "@/lib/session";
import { getMyPayslips } from "@/server/queries";
import { PageHeader } from "@/components/page-header";
import { PayslipList } from "@/components/payslip-list";
import { EmptyState } from "@/components/ui/empty-state";

export default async function MisRecibosPage() {
  const { user, scope } = await requireEmployee();
  // El alcance filtra por employeeId: solo salen los recibos propios.
  const porAnio = await getMyPayslips(scope);
  const total = porAnio.reduce((acc, g) => acc + g.payslips.length, 0);

  const nombre = user.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={`Hola, ${nombre}`}
        description={
          total > 0
            ? `Tenés ${total} recibo${total === 1 ? "" : "s"} disponible${total === 1 ? "" : "s"}.`
            : "Acá vas a ver tus recibos de sueldo."
        }
      />

      {porAnio.length === 0 ? (
        <EmptyState
          title="Todavía no tenés recibos"
          description="Cuando el estudio cargue tu primer recibo, te avisamos y aparece acá."
          icon={Receipt}
        />
      ) : (
        <div className="space-y-6">
          {porAnio.map((grupo) => (
            <section key={grupo.year}>
              <h2 className="mb-2 px-1 text-sm font-semibold text-slate-500">{grupo.year}</h2>
              <PayslipList payslips={grupo.payslips} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
