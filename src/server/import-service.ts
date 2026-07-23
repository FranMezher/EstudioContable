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
  /** CUIT del empleador leído del PDF. Sirve para resolver la empresa sola. */
  employerCuit?: string | null;
  /** CUIL del empleado (del PDF). Es el matcheo principal. */
  cuil?: string | null;
  /** Legajo (del nombre del archivo o del PDF). Matcheo secundario. */
  legajo?: string | null;
  dni?: string | null;
  /** Nombre para dar de alta al empleado si no existe todavía. */
  employeeName?: string | null;
  periodMonth: number;
  periodYear: number;
  netAmount?: number | null;
  /** Número de liquidación. Distingue recibos del mismo mes y da idempotencia. */
  liqNumber?: string | null;
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

/**
 * Resuelve la empresa, siempre dentro del alcance. Con una key de estudio la
 * busca por (en orden): companyRef explícito, o el CUIT del empleador del PDF.
 */
async function resolveCompany(actor: Actor, input: ImportPayslipInput) {
  if (actor.scope.kind !== "studio") {
    const company = await prisma.company.findUnique({ where: { id: actor.scope.companyId } });
    if (!company) throw new ServiceError("No encontrado", 404);
    return company;
  }

  const ref = input.companyRef?.trim();
  if (ref) {
    const cuit = normalizeCuil(ref);
    const company = await prisma.company.findFirst({
      where: cuit.length === 11 ? { OR: [{ id: ref }, { cuit }] } : { id: ref },
    });
    if (company) return company;
  }

  const employerCuit = normalizeCuil(input.employerCuit);
  if (employerCuit.length === 11) {
    const company = await prisma.company.findUnique({ where: { cuit: employerCuit } });
    if (company) return company;
  }

  throw new ServiceError(
    `No pude identificar la empresa (companyRef "${ref ?? ""}", CUIT empleador "${employerCuit || "?"}")`,
    404
  );
}

export async function svcImportPayslip(
  actor: Actor,
  input: ImportPayslipInput
): Promise<ImportPayslipResult> {
  assertCanWrite(actor.scope);

  const company = await resolveCompany(actor, input);

  const cuil = normalizeCuil(input.cuil);
  const legajo = input.legajo?.trim() || null;
  if (!cuil && !legajo) {
    throw new ServiceError("El recibo no trae ni CUIL ni legajo para identificar al empleado", 400);
  }
  if (cuil && !isValidCuil(cuil)) {
    throw new ServiceError(`El CUIL "${input.cuil}" no es válido`, 400);
  }

  // Un mismo archivo ya importado no se vuelve a cargar (idempotencia por hash).
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

  // Matcheo del empleado: primero por CUIL (único global), después por legajo.
  let employee =
    (cuil
      ? await prisma.employee.findUnique({ where: { companyId_cuil: { companyId: company.id, cuil } } })
      : null) ??
    (legajo
      ? await prisma.employee.findUnique({ where: { companyId_legajo: { companyId: company.id, legajo } } })
      : null);
  let employeeCreated = false;

  if (!employee) {
    if (!cuil) {
      throw new ServiceError(
        `El legajo ${legajo} no existe en ${company.name} y sin CUIL no puedo darlo de alta`,
        404
      );
    }
    if (!input.employeeName?.trim()) {
      throw new ServiceError(
        `El CUIL ${cuil} no existe en ${company.name} y no vino el nombre para darlo de alta`,
        404
      );
    }
    // Alta automática: queda pendiente de revisión del estudio y NO se le
    // genera acceso al portal solo.
    employee = await svcCreateEmployee(
      actor,
      { companyId: company.id, name: input.employeeName, cuil, legajo, dni: input.dni ?? null },
      { autoCreated: true }
    );
    employeeCreated = true;
  }

  // Misma liquidación ya cargada para este empleado → duplicado (permite
  // varios recibos por mes mientras la liquidación sea distinta).
  const liqNumber = input.liqNumber?.trim() || null;
  if (liqNumber) {
    const existente = await prisma.payslip.findUnique({
      where: { employeeId_liqNumber: { employeeId: employee.id, liqNumber } },
      select: { id: true },
    });
    if (existente) {
      return { status: "DUPLICADO", payslipId: existente.id, employeeId: employee.id, employeeCreated };
    }
  }

  const payslip = await svcCreatePayslip(actor, {
    employeeId: employee.id,
    periodMonth: input.periodMonth,
    periodYear: input.periodYear,
    file: input.file,
    fileName: input.fileName,
    netAmount: input.netAmount ?? null,
    liqNumber,
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
  detectedLegajo?: string | null;
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
        detectedLegajo: i.detectedLegajo ?? null,
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
