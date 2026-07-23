import { prisma } from "@/lib/prisma";
import {
  companyWhere,
  employeeWhere,
  payslipWhere,
  scoped,
  ServiceError,
  type Scope,
} from "@/server/scope";

/**
 * Todas las lecturas del portal viven acá y todas arrancan por el filtro de
 * alcance. Si una consulta nueva no llama a companyWhere/employeeWhere/
 * payslipWhere, está mal.
 */

export type PayslipDTO = {
  id: string;
  periodMonth: number;
  periodYear: number;
  liqNumber: string | null;
  label: string | null;
  fileName: string;
  fileSize: number | null;
  netAmount: number | null;
  source: "MANUAL" | "IMPORT" | "API";
  createdAt: string;
};

export type EmployeeDTO = {
  id: string;
  name: string;
  cuil: string;
  position: string | null;
  isActive: boolean;
  autoCreated: boolean;
  hasAccess: boolean;
  payslipCount: number;
  lastPeriod: { month: number; year: number } | null;
};

export type CompanyDTO = {
  id: string;
  name: string;
  cuit: string | null;
  email: string | null;
  phone: string | null;
  employeeCount: number;
  payslipCount: number;
};

function toPayslipDTO(p: {
  id: string;
  periodMonth: number;
  periodYear: number;
  liqNumber: string | null;
  label: string | null;
  fileName: string;
  fileSize: number | null;
  netAmount: unknown;
  source: "MANUAL" | "IMPORT" | "API";
  createdAt: Date;
}): PayslipDTO {
  return {
    id: p.id,
    periodMonth: p.periodMonth,
    periodYear: p.periodYear,
    liqNumber: p.liqNumber,
    label: p.label,
    fileName: p.fileName,
    fileSize: p.fileSize,
    netAmount: p.netAmount ? Number(p.netAmount) : null,
    source: p.source,
    createdAt: p.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// EMPRESAS
// ---------------------------------------------------------------------------

export async function getCompanies(scope: Scope, search?: string): Promise<CompanyDTO[]> {
  const filter = search?.trim()
    ? { OR: [{ name: { contains: search.trim(), mode: "insensitive" as const } }, { cuit: { contains: search.replace(/\D/g, "") } }] }
    : undefined;

  const rows = await prisma.company.findMany({
    where: scoped(companyWhere(scope), filter),
    orderBy: { name: "asc" },
    include: {
      _count: { select: { employees: true } },
      employees: { select: { _count: { select: { payslips: true } } } },
    },
  });

  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    cuit: c.cuit,
    email: c.email,
    phone: c.phone,
    employeeCount: c._count.employees,
    payslipCount: c.employees.reduce((acc, e) => acc + e._count.payslips, 0),
  }));
}

export async function getCompany(scope: Scope, companyId: string) {
  const company = await prisma.company.findFirst({
    where: scoped(companyWhere(scope), { id: companyId }),
  });
  if (!company) throw new ServiceError("No encontrado", 404);
  return company;
}

// ---------------------------------------------------------------------------
// EMPLEADOS
// ---------------------------------------------------------------------------

export async function getEmployees(
  scope: Scope,
  opts: { companyId?: string; search?: string } = {}
): Promise<EmployeeDTO[]> {
  const filters = [];
  if (opts.companyId) filters.push({ companyId: opts.companyId });
  if (opts.search?.trim()) {
    const s = opts.search.trim();
    filters.push({
      OR: [
        { name: { contains: s, mode: "insensitive" as const } },
        { cuil: { contains: s.replace(/\D/g, "") } },
      ],
    });
  }

  const rows = await prisma.employee.findMany({
    where: scoped(employeeWhere(scope), ...filters),
    orderBy: { name: "asc" },
    include: {
      _count: { select: { payslips: true } },
      user: { select: { id: true } },
      payslips: {
        orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
        take: 1,
        select: { periodMonth: true, periodYear: true },
      },
    },
  });

  return rows.map((e) => ({
    id: e.id,
    name: e.name,
    cuil: e.cuil,
    position: e.position,
    isActive: e.isActive,
    autoCreated: e.autoCreated,
    hasAccess: !!e.user,
    payslipCount: e._count.payslips,
    lastPeriod: e.payslips[0]
      ? { month: e.payslips[0].periodMonth, year: e.payslips[0].periodYear }
      : null,
  }));
}

export async function getEmployeeDetail(scope: Scope, employeeId: string) {
  const employee = await prisma.employee.findFirst({
    where: scoped(employeeWhere(scope), { id: employeeId }),
    include: {
      company: { select: { id: true, name: true } },
      user: { select: { id: true, isActive: true, lastLoginAt: true } },
    },
  });
  if (!employee) throw new ServiceError("No encontrado", 404);

  const payslips = await prisma.payslip.findMany({
    where: scoped(payslipWhere(scope), { employeeId }),
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
  });

  return {
    id: employee.id,
    name: employee.name,
    cuil: employee.cuil,
    position: employee.position,
    isActive: employee.isActive,
    firstName: employee.firstName,
    lastName: employee.lastName,
    legajo: employee.legajo,
    dni: employee.dni,
    address: employee.address,
    profileCompletedAt: employee.profileCompletedAt?.toISOString() ?? null,
    company: employee.company,
    access: employee.user
      ? {
          isActive: employee.user.isActive,
          lastLoginAt: employee.user.lastLoginAt?.toISOString() ?? null,
        }
      : null,
    payslips: payslips.map(toPayslipDTO),
  };
}

// ---------------------------------------------------------------------------
// RECIBOS
// ---------------------------------------------------------------------------

/** Los recibos del propio empleado, agrupados por año. */
export async function getMyPayslips(scope: Scope) {
  const rows = await prisma.payslip.findMany({
    where: payslipWhere(scope),
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
  });

  const porAnio = new Map<number, PayslipDTO[]>();
  for (const row of rows) {
    const dto = toPayslipDTO(row);
    const lista = porAnio.get(dto.periodYear) ?? [];
    lista.push(dto);
    porAnio.set(dto.periodYear, lista);
  }

  return [...porAnio.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, payslips]) => ({ year, payslips }));
}

/** Años con al menos un recibo, para los filtros de período. */
export async function getAvailableYears(scope: Scope): Promise<number[]> {
  const rows = await prisma.payslip.findMany({
    where: payslipWhere(scope),
    distinct: ["periodYear"],
    select: { periodYear: true },
    orderBy: { periodYear: "desc" },
  });
  return rows.map((r) => r.periodYear);
}

// ---------------------------------------------------------------------------
// TABLERO
// ---------------------------------------------------------------------------

export async function getDashboardStats(scope: Scope) {
  const [companies, employees, payslips, lastPayslip] = await Promise.all([
    prisma.company.count({ where: companyWhere(scope) }),
    prisma.employee.count({ where: scoped(employeeWhere(scope), { isActive: true }) }),
    prisma.payslip.count({ where: payslipWhere(scope) }),
    prisma.payslip.findFirst({
      where: payslipWhere(scope),
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      select: { periodMonth: true, periodYear: true },
    }),
  ]);

  return { companies, employees, payslips, lastPeriod: lastPayslip };
}

/** Empleados creados por el importador que el estudio todavía no revisó. */
export async function getPendingReview(scope: Scope) {
  const [autoEmployees, pendingItems] = await Promise.all([
    prisma.employee.findMany({
      where: scoped(employeeWhere(scope), { autoCreated: true }),
      include: { company: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.importItem.findMany({
      where: { resolvedAt: null, status: { not: "OK" } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { run: { select: { sourceLabel: true, startedAt: true } } },
    }),
  ]);

  return { autoEmployees, pendingItems };
}

export async function getImportRuns(limit = 20) {
  const runs = await prisma.importRun.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
    include: { company: { select: { name: true } } },
  });
  return runs.map((r) => ({
    id: r.id,
    sourceLabel: r.sourceLabel,
    company: r.company?.name ?? "Varias",
    isDryRun: r.isDryRun,
    totalFiles: r.totalFiles,
    createdCount: r.createdCount,
    skippedCount: r.skippedCount,
    errorCount: r.errorCount,
    startedAt: r.startedAt.toISOString(),
    finishedAt: r.finishedAt?.toISOString() ?? null,
  }));
}
