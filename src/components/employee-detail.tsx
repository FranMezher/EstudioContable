import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { formatCuil, periodoLabel } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { PayslipList } from "@/components/payslip-list";
import { UploadPayslipForm } from "@/components/forms/upload-payslip-form";
import { DeletePayslipButton } from "@/components/delete-payslip-button";
import { CreateEmployeeAccess } from "@/components/forms/create-employee-access";
import { PersonalDataCard } from "@/components/forms/personal-data-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Detail = Awaited<ReturnType<typeof import("@/server/queries").getEmployeeDetail>>;

/**
 * Ficha del empleado. La usan el estudio y el admin de empresa; el empleado
 * nunca llega acá (su vista es /mis-recibos).
 */
export function EmployeeDetail({
  employee,
  backHref,
  backLabel,
  showCompany = false,
}: {
  employee: Detail;
  backHref: string;
  backLabel: string;
  showCompany?: boolean;
}) {
  return (
    <>
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> {backLabel}
      </Link>

      <PageHeader
        title={employee.name}
        description={[
          formatCuil(employee.cuil),
          employee.position,
          showCompany ? employee.company.name : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        action={<UploadPayslipForm employeeId={employee.id} />}
      />

      <PersonalDataCard employee={employee} />

      <Card className="mb-5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <KeyRound className="h-4 w-4 text-slate-400" />
            {employee.access ? (
              <>
                <span>Acceso al portal creado</span>
                {employee.access.isActive ? (
                  <Badge tone="success">Activo</Badge>
                ) : (
                  <Badge tone="danger">Desactivado</Badge>
                )}
                <span className="text-xs text-slate-400">
                  {employee.access.lastLoginAt
                    ? `Último ingreso: ${formatDateTime(employee.access.lastLoginAt)}`
                    : "Nunca ingresó"}
                </span>
              </>
            ) : (
              <span>Todavía no tiene acceso al portal.</span>
            )}
          </div>
          {!employee.access && (
            <CreateEmployeeAccess employeeId={employee.id} employeeName={employee.name} />
          )}
        </CardContent>
      </Card>

      <h2 className="mb-2 text-sm font-semibold text-slate-500">
        Recibos ({employee.payslips.length})
      </h2>
      <PayslipList
        payslips={employee.payslips}
        actions={(p) => (
          <DeletePayslipButton
            payslipId={p.id}
            label={periodoLabel(p.periodMonth, p.periodYear)}
          />
        )}
      />
    </>
  );
}
