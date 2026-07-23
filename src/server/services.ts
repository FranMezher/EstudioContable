import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { deleteFile, payslipPath, uploadPayslipFile } from "@/lib/blob";
import { notifyUsers } from "@/lib/notifications";
import { normalizeCuil, isValidCuil, periodoLabel } from "@/lib/constants";
import {
  ServiceError,
  assertCanWrite,
  assertStudio,
  companyWhere,
  employeeWhere,
  payslipWhere,
  resolveCompanyId,
  scoped,
  type Scope,
} from "@/server/scope";
import type { PayslipSource, Role } from "@/generated/prisma/enums";

export { ServiceError };

export type Actor = { userId: string; scope: Scope };

// ---------------------------------------------------------------------------
// RESOLUCIÓN CON ALCANCE
// Todo lo que se busca por id pasa por acá: el id se combina con el filtro de
// alcance, así un recurso ajeno simplemente "no existe" (404, nunca 403).
// ---------------------------------------------------------------------------

export async function findEmployeeInScope(scope: Scope, employeeId: string) {
  const employee = await prisma.employee.findFirst({
    where: scoped(employeeWhere(scope), { id: employeeId }),
    include: { company: { select: { id: true, name: true } } },
  });
  if (!employee) throw new ServiceError("No encontrado", 404);
  return employee;
}

export async function findPayslipInScope(scope: Scope, payslipId: string) {
  const payslip = await prisma.payslip.findFirst({
    where: scoped(payslipWhere(scope), { id: payslipId }),
    include: { employee: { select: { id: true, name: true, companyId: true } } },
  });
  if (!payslip) throw new ServiceError("No encontrado", 404);
  return payslip;
}

async function assertCompanyInScope(scope: Scope, companyId: string) {
  const company = await prisma.company.findFirst({
    where: scoped(companyWhere(scope), { id: companyId }),
    select: { id: true, name: true },
  });
  if (!company) throw new ServiceError("No encontrado", 404);
  return company;
}

// ---------------------------------------------------------------------------
// EMPRESAS
// ---------------------------------------------------------------------------

export async function svcCreateCompany(
  actor: Actor,
  input: { name: string; cuit?: string | null; email?: string | null; phone?: string | null }
) {
  assertStudio(actor.scope);
  const name = input.name?.trim();
  if (!name) throw new ServiceError("Indicá el nombre de la empresa");

  const cuit = input.cuit ? normalizeCuil(input.cuit) : null;
  if (cuit && !isValidCuil(cuit)) throw new ServiceError("El CUIT no es válido");
  if (cuit) {
    const dup = await prisma.company.findUnique({ where: { cuit }, select: { id: true } });
    if (dup) throw new ServiceError("Ya existe una empresa con ese CUIT");
  }

  return prisma.company.create({
    data: { name, cuit, email: input.email?.trim() || null, phone: input.phone?.trim() || null },
  });
}

export async function svcUpdateCompany(
  actor: Actor,
  companyId: string,
  input: { name?: string; email?: string | null; phone?: string | null; notes?: string | null }
) {
  assertStudio(actor.scope);
  await assertCompanyInScope(actor.scope, companyId);
  return prisma.company.update({
    where: { id: companyId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
      ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
    },
  });
}

// ---------------------------------------------------------------------------
// EMPLEADOS
// ---------------------------------------------------------------------------

export type EmployeeInput = {
  companyId?: string | null;
  name: string;
  cuil: string;
  position?: string | null;
  legajo?: string | null;
  dni?: string | null;
};

export async function svcCreateEmployee(actor: Actor, input: EmployeeInput, opts?: { autoCreated?: boolean }) {
  assertCanWrite(actor.scope);
  const companyId = resolveCompanyId(actor.scope, input.companyId);
  await assertCompanyInScope(actor.scope, companyId);

  const name = input.name?.trim();
  if (!name) throw new ServiceError("Indicá el nombre del empleado");

  const cuil = normalizeCuil(input.cuil);
  if (!isValidCuil(cuil)) throw new ServiceError("El CUIL no es válido");

  const dup = await prisma.employee.findUnique({
    where: { companyId_cuil: { companyId, cuil } },
    select: { id: true },
  });
  if (dup) throw new ServiceError("Ya hay un empleado con ese CUIL en esta empresa");

  const legajo = input.legajo?.trim() || null;
  if (legajo) await assertLegajoLibre(companyId, legajo);

  return prisma.employee.create({
    data: {
      companyId,
      name,
      cuil,
      position: input.position?.trim() || null,
      legajo,
      dni: input.dni ? normalizeCuil(input.dni) || null : null,
      autoCreated: opts?.autoCreated ?? false,
    },
  });
}

/** Nombre para mostrar a partir de apellido + nombre (formato "APELLIDO Nombre"). */
function displayName(lastName?: string | null, firstName?: string | null, fallback = "") {
  const armado = [lastName?.trim(), firstName?.trim()].filter(Boolean).join(" ");
  return armado || fallback;
}

export type PersonalDataInput = {
  firstName?: string | null;
  lastName?: string | null;
  legajo?: string | null;
  dni?: string | null;
  address?: string | null;
};

/** Solo el admin edita los datos personales del empleado. */
export async function svcUpdateEmployee(
  actor: Actor,
  employeeId: string,
  input: PersonalDataInput & { position?: string | null; isActive?: boolean }
) {
  assertCanWrite(actor.scope);
  const current = await findEmployeeInScope(actor.scope, employeeId);

  const firstName = input.firstName !== undefined ? input.firstName?.trim() || null : current.firstName;
  const lastName = input.lastName !== undefined ? input.lastName?.trim() || null : current.lastName;
  const legajo = input.legajo !== undefined ? (input.legajo?.trim() || null) : undefined;
  const dni = input.dni !== undefined ? normalizeCuil(input.dni) || null : undefined;

  if (legajo) await assertLegajoLibre(current.companyId, legajo, employeeId);

  return prisma.employee.update({
    where: { id: employeeId },
    data: {
      ...(input.firstName !== undefined || input.lastName !== undefined
        ? { firstName, lastName, name: displayName(lastName, firstName, current.name) }
        : {}),
      ...(legajo !== undefined ? { legajo } : {}),
      ...(dni !== undefined ? { dni } : {}),
      ...(input.address !== undefined ? { address: input.address?.trim() || null } : {}),
      ...(input.position !== undefined ? { position: input.position?.trim() || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      // Si un admin lo edita, deja de estar pendiente de revisión.
      autoCreated: false,
    },
  });
}

async function assertLegajoLibre(companyId: string, legajo: string, exceptEmployeeId?: string) {
  const dup = await prisma.employee.findUnique({
    where: { companyId_legajo: { companyId, legajo } },
    select: { id: true },
  });
  if (dup && dup.id !== exceptEmployeeId)
    throw new ServiceError("Ya hay un empleado con ese legajo en esta empresa");
}

/**
 * El empleado completa su perfil en el primer ingreso. Es una excepción
 * controlada a "el empleado no escribe": solo toca SU propio legajo, una
 * sola vez, y nunca más puede modificarlo (después es tarea del admin).
 */
export async function svcCompleteMyProfile(
  userId: string,
  input: Required<Pick<PersonalDataInput, "firstName" | "lastName" | "dni">> & PersonalDataInput
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { employee: true },
  });
  if (user?.role !== "EMPLOYEE" || !user.employee) throw new ServiceError("No autorizado", 403);
  if (user.employee.profileCompletedAt)
    throw new ServiceError("Tu perfil ya fue cargado. Si hay un error, avisale al estudio.", 409);

  const firstName = input.firstName?.trim();
  const lastName = input.lastName?.trim();
  const dni = normalizeCuil(input.dni);
  if (!firstName || !lastName) throw new ServiceError("Completá nombre y apellido");
  if (dni.length < 7) throw new ServiceError("El DNI no parece válido");

  const legajo = input.legajo?.trim() || null;
  if (legajo) await assertLegajoLibre(user.employee.companyId, legajo, user.employee.id);

  await prisma.employee.update({
    where: { id: user.employee.id },
    data: {
      firstName,
      lastName,
      dni,
      legajo,
      address: input.address?.trim() || null,
      name: displayName(lastName, firstName, user.employee.name),
      profileCompletedAt: new Date(),
    },
  });
}

// ---------------------------------------------------------------------------
// RECIBOS
// ---------------------------------------------------------------------------

export type PayslipInput = {
  employeeId: string;
  periodMonth: number;
  periodYear: number;
  file: Buffer | File;
  fileName: string;
  netAmount?: number | null;
  liqNumber?: string | null;
  label?: string | null;
  sourceHash?: string | null;
  source?: PayslipSource;
};

function validatePeriod(month: number, year: number) {
  if (!Number.isInteger(month) || month < 1 || month > 12)
    throw new ServiceError("El mes del período tiene que estar entre 1 y 12");
  if (!Number.isInteger(year) || year < 2000 || year > 2100)
    throw new ServiceError("El año del período no es válido");
}

/**
 * Carga un recibo. Un empleado puede tener VARIOS en el mismo mes (sueldo,
 * SAC, bonos): la unicidad es por número de liquidación, no por período.
 */
export async function svcCreatePayslip(actor: Actor, input: PayslipInput) {
  assertCanWrite(actor.scope);
  const employee = await findEmployeeInScope(actor.scope, input.employeeId);
  validatePeriod(input.periodMonth, input.periodYear);

  const liqNumber = input.liqNumber?.trim() || null;
  if (liqNumber) {
    const existing = await prisma.payslip.findUnique({
      where: { employeeId_liqNumber: { employeeId: employee.id, liqNumber } },
      select: { id: true },
    });
    if (existing) {
      throw new ServiceError(
        `${employee.name} ya tiene cargada la liquidación ${liqNumber}`,
        409
      );
    }
  }

  const path = payslipPath({
    companyId: employee.companyId,
    employeeId: employee.id,
    periodYear: input.periodYear,
    periodMonth: input.periodMonth,
    fileName: input.fileName,
    // El discriminador evita pisar otro recibo del mismo mes.
    discriminator: liqNumber ?? String(Date.now()),
  });
  const { path: filePath, size } = await uploadPayslipFile(input.file, path);

  const payslip = await prisma.payslip.create({
    data: {
      employeeId: employee.id,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      liqNumber,
      label: input.label?.trim() || null,
      filePath,
      fileName: input.fileName,
      fileSize: size,
      netAmount: input.netAmount ?? undefined,
      sourceHash: input.sourceHash ?? null,
      source: input.source ?? "MANUAL",
      uploadedById: actor.userId,
    },
  });

  await notifyPayslip(employee.id, input.periodMonth, input.periodYear);
  return payslip;
}

/** Avisa al empleado (si tiene acceso creado) que le cargaron un recibo. */
export async function notifyPayslip(employeeId: string, month: number, year: number) {
  const user = await prisma.user.findUnique({
    where: { employeeId },
    select: { id: true, isActive: true },
  });
  if (!user?.isActive) return;
  await notifyUsers([user.id], {
    type: "PAYSLIP",
    title: "Nuevo recibo de sueldo",
    message: `Ya está disponible tu recibo de ${periodoLabel(month, year)}.`,
    link: "/mis-recibos",
  });
}

export async function svcDeletePayslip(actor: Actor, payslipId: string) {
  assertCanWrite(actor.scope);
  const payslip = await findPayslipInScope(actor.scope, payslipId);
  await prisma.payslip.delete({ where: { id: payslip.id } });
  await deleteFile(payslip.filePath);
}

/** El admin tilda un recibo como pagado (o lo destilda). */
export async function svcSetPayslipPaid(actor: Actor, payslipId: string, paid: boolean) {
  assertCanWrite(actor.scope);
  const payslip = await findPayslipInScope(actor.scope, payslipId);
  return prisma.payslip.update({
    where: { id: payslip.id },
    data: {
      paidAt: paid ? new Date() : null,
      paidById: paid ? actor.userId : null,
    },
  });
}

// ---------------------------------------------------------------------------
// USUARIOS
// ---------------------------------------------------------------------------

export function generateProvisionalPassword() {
  // Legible al dictarlo por teléfono: sin caracteres ambiguos.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    crypto.randomBytes(10),
    (b) => chars[b % chars.length]
  ).join("");
}

export type NewUserInput = {
  role: Role;
  name: string;
  companyId?: string | null;
  employeeId?: string | null;
  email?: string | null;
  password?: string | null;
};

/**
 * Crea un acceso. Devuelve la contraseña provisoria para mostrarla una sola vez.
 * El alta del usuario de un empleado siempre la confirma un admin: el
 * importador no genera accesos solo (un CUIL mal leído no puede terminar en
 * un acceso a los recibos de otra persona).
 */
export async function svcCreateUser(actor: Actor, input: NewUserInput) {
  assertCanWrite(actor.scope);
  if (input.role === "STUDIO_ADMIN") assertStudio(actor.scope);

  const name = input.name?.trim();
  if (!name) throw new ServiceError("Indicá el nombre");

  const chosen = input.password?.trim();
  if (chosen && chosen.length < 6)
    throw new ServiceError("La contraseña tiene que tener al menos 6 caracteres");
  const password = chosen || generateProvisionalPassword();
  const passwordHash = await bcrypt.hash(password, 10);

  let email: string | null = null;
  let cuil: string | null = null;
  let companyId: string | null = null;
  let employeeId: string | null = null;

  if (input.role === "EMPLOYEE") {
    if (!input.employeeId) throw new ServiceError("Indicá el empleado");
    const employee = await findEmployeeInScope(actor.scope, input.employeeId);
    const taken = await prisma.user.findUnique({
      where: { employeeId: employee.id },
      select: { id: true },
    });
    if (taken) throw new ServiceError("Ese empleado ya tiene un acceso creado");
    const cuilTaken = await prisma.user.findUnique({
      where: { cuil: employee.cuil },
      select: { id: true },
    });
    if (cuilTaken) throw new ServiceError("Ya existe un usuario con ese CUIL");

    cuil = employee.cuil;
    companyId = employee.companyId;
    employeeId = employee.id;
  } else {
    email = input.email?.toLowerCase().trim() || null;
    if (!email) throw new ServiceError("Indicá el email");
    const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (taken) throw new ServiceError("Ya existe un usuario con ese email");

    if (input.role === "COMPANY_ADMIN") {
      companyId = resolveCompanyId(actor.scope, input.companyId);
      await assertCompanyInScope(actor.scope, companyId);
    }
  }

  const user = await prisma.user.create({
    data: {
      name,
      role: input.role,
      email,
      cuil,
      companyId,
      employeeId,
      passwordHash,
      mustChangePassword: true,
    },
  });

  return { user, password };
}

export async function svcSetUserActive(actor: Actor, userId: string, isActive: boolean) {
  assertCanWrite(actor.scope);
  const user = await prisma.user.findFirst({
    where:
      actor.scope.kind === "studio"
        ? { id: userId }
        : { id: userId, companyId: actor.scope.companyId, role: { not: "STUDIO_ADMIN" } },
    select: { id: true },
  });
  if (!user) throw new ServiceError("No encontrado", 404);
  return prisma.user.update({ where: { id: userId }, data: { isActive } });
}

export async function svcResetPassword(actor: Actor, userId: string) {
  assertCanWrite(actor.scope);
  const user = await prisma.user.findFirst({
    where:
      actor.scope.kind === "studio"
        ? { id: userId }
        : { id: userId, companyId: actor.scope.companyId, role: { not: "STUDIO_ADMIN" } },
    select: { id: true },
  });
  if (!user) throw new ServiceError("No encontrado", 404);

  const password = generateProvisionalPassword();
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true },
  });
  return password;
}

/** Cambio de contraseña propio. Lo puede hacer cualquier rol, incluido el empleado. */
export async function svcChangeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  if (newPassword.length < 8)
    throw new ServiceError("La contraseña nueva tiene que tener al menos 8 caracteres");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ServiceError("No encontrado", 404);

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new ServiceError("La contraseña actual no es correcta");

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(newPassword, 10), mustChangePassword: false },
  });
}
