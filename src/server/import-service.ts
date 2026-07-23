import { prisma } from "@/lib/prisma";
import { normalizeCuil, isValidCuil } from "@/lib/constants";
import { ServiceError, assertCanWrite } from "@/server/scope";
import { svcCreateEmployee, svcCreatePayslip, type Actor } from "@/server/services";
import type { ImportItemStatus } from "@/generated/prisma/enums";

/**
 * Alta de recibos desde el importador. A diferencia de la carga manual, acá no
 * se conoce el `employeeId`: el archivo llega con el CUIL y la referencia de la
 * empresa, y este servicio resuelve el resto.
 */
export type ImportPayslipInput = {
  /** Id o CUIT de la empresa. Se ignora si la key ya está limitada a una. */
  companyRef?: string | null;
  cuil: string;
  /** Nombre para dar de alta al empleado si el CUIL todavía no existe. */
  employeeName?: string | null;
  periodMonth: number;
  periodYear: number;
  netAmount?: number | null;
  file: Buffer;
  fileName: string;
  sourceHash: string;
};

export type ImportPayslipResult = {
  status: Extract<ImportItemStatus, "OK" | "DUPLICADO">;
  payslipId?: string;
  employeeId: string;
  employeeCreated: boolean;
};

/** Resuelve la empresa por id o por CUIT, siempre dentro del alcance. */
async function resolveCompany(actor: Actor, ref?: string | null) {
  if (actor.scope.kind !== "studio") {
    // La key está limitada: la empresa la fija el alcance, no el body.
    const company = await prisma.company.findUnique({ where: { id: actor.scope.companyId } });
    if (!company) throw new ServiceError("No encontrado", 404);
    return company;
  }

  if (!ref?.trim()) throw new ServiceError("Falta indicar la empresa (companyRef)", 400);
  const value = ref.trim();
  const cuit = normalizeCuil(value);

  const company = await prisma.company.findFirst({
    where: cuit.length === 11 ? { OR: [{ id: value }, { cuit }] } : { id: value },
  });
  if (!company) throw new ServiceError(`No existe la empresa "${value}"`, 404);
  return company;
}

export async function svcImportPayslip(
  actor: Actor,
  input: ImportPayslipInput
): Promise<ImportPayslipResult> {
  assertCanWrite(actor.scope);

  const company = await resolveCompany(actor, input.companyRef);

  const cuil = normalizeCuil(input.cuil);
  if (!isValidCuil(cuil)) throw new ServiceError(`El CUIL "${input.cuil}" no es válido`, 400);

  // Un mismo archivo ya importado no se vuelve a cargar, aunque se re-corra
  // el importador sobre la misma carpeta.
  const yaImportado = await prisma.payslip.findFirst({
    where: { sourceHash: input.sourceHash, employee: { companyId: company.id } },
    select: { id: true, employeeId: true },
  });
  if (yaImportado) {
    return {
      status: "DUPLICADO",
      payslipId: yaImportado.id,
      employeeId: yaImportado.employeeId,
      employeeCreated: false,
    };
  }

  let employee = await prisma.employee.findUnique({
    where: { companyId_cuil: { companyId: company.id, cuil } },
  });
  let employeeCreated = false;

  if (!employee) {
    if (!input.employeeName?.trim()) {
      throw new ServiceError(
        `El CUIL ${cuil} no existe en ${company.name} y no vino el nombre para darlo de alta`,
        404
      );
    }
    // Se crea marcado como autoCreated: queda pendiente de revisión del
    // estudio, y NO se le genera acceso al portal automáticamente.
    employee = await svcCreateEmployee(
      actor,
      { companyId: company.id, name: input.employeeName, cuil },
      { autoCreated: true }
    );
    employeeCreated = true;
  }

  const existente = await prisma.payslip.findUnique({
    where: {
      employeeId_periodYear_periodMonth: {
        employeeId: employee.id,
        periodYear: input.periodYear,
        periodMonth: input.periodMonth,
      },
    },
    select: { id: true },
  });
  if (existente) {
    return {
      status: "DUPLICADO",
      payslipId: existente.id,
      employeeId: employee.id,
      employeeCreated,
    };
  }

  const payslip = await svcCreatePayslip(actor, {
    employeeId: employee.id,
    periodMonth: input.periodMonth,
    periodYear: input.periodYear,
    file: input.file,
    fileName: input.fileName,
    netAmount: input.netAmount ?? null,
    sourceHash: input.sourceHash,
    source: "IMPORT",
  });

  return { status: "OK", payslipId: payslip.id, employeeId: employee.id, employeeCreated };
}

// ---------------------------------------------------------------------------
// REGISTRO DE CORRIDAS
// ---------------------------------------------------------------------------

export async function svcStartImportRun(
  actor: Actor,
  input: { sourceLabel: string; isDryRun?: boolean; companyId?: string | null }
) {
  assertCanWrite(actor.scope);
  return prisma.importRun.create({
    data: {
      sourceLabel: input.sourceLabel.slice(0, 300),
      isDryRun: input.isDryRun ?? false,
      companyId: actor.scope.kind === "studio" ? input.companyId ?? null : actor.scope.companyId,
      startedById: actor.userId,
    },
  });
}

export type ImportItemInput = {
  fileName: string;
  status: ImportItemStatus;
  message?: string | null;
  detectedCuil?: string | null;
  detectedCompany?: string | null;
  periodMonth?: number | null;
  periodYear?: number | null;
  employeeId?: string | null;
  payslipId?: string | null;
};

export async function svcFinishImportRun(
  actor: Actor,
  runId: string,
  items: ImportItemInput[]
) {
  assertCanWrite(actor.scope);

  const run = await prisma.importRun.findUnique({ where: { id: runId }, select: { id: true } });
  if (!run) throw new ServiceError("No encontrado", 404);

  if (items.length > 0) {
    await prisma.importItem.createMany({
      data: items.map((i) => ({
        runId,
        fileName: i.fileName.slice(0, 300),
        status: i.status,
        message: i.message?.slice(0, 500) ?? null,
        detectedCuil: i.detectedCuil ?? null,
        detectedCompany: i.detectedCompany ?? null,
        periodMonth: i.periodMonth ?? null,
        periodYear: i.periodYear ?? null,
        employeeId: i.employeeId ?? null,
        payslipId: i.payslipId ?? null,
        // Lo que salió bien no necesita revisión.
        resolvedAt: i.status === "OK" ? new Date() : null,
      })),
    });
  }

  const created = items.filter((i) => i.status === "OK").length;
  const skipped = items.filter((i) => i.status === "DUPLICADO").length;

  return prisma.importRun.update({
    where: { id: runId },
    data: {
      totalFiles: items.length,
      createdCount: created,
      skippedCount: skipped,
      errorCount: items.length - created - skipped,
      finishedAt: new Date(),
    },
  });
}
