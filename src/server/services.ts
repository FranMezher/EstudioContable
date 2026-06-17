import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/blob";
import { notifyUsers, getAdminUserIds } from "@/lib/notifications";
import { sendEmail, emailLayout } from "@/lib/email";
import { SETTING_KEYS, DECLARATION_TYPES, periodoLabel } from "@/lib/constants";
import type { DeclarationType } from "@/generated/prisma/enums";

/** Identidad de quien ejecuta una operación (sesión web o API key). */
export type Actor = {
  userId: string;
  role: "ADMIN" | "CLIENT";
  clientId: string | null;
};

/** Error de negocio con código HTTP sugerido. */
export class ServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Resuelve y valida sobre qué cliente opera el actor. */
export function resolveClientId(actor: Actor, requested?: string | null): string {
  if (actor.role === "ADMIN") {
    if (!requested) throw new ServiceError("Falta indicar el cliente (clientId)", 400);
    return requested;
  }
  if (!actor.clientId) throw new ServiceError("El usuario no tiene un cliente asociado", 403);
  if (requested && requested !== actor.clientId)
    throw new ServiceError("Acceso no autorizado a ese cliente", 403);
  return actor.clientId;
}

/** Usuarios a notificar sobre un cliente (admins + usuarios del cliente). */
export async function recipientsForClient(clientId: string, excludeUserId?: string) {
  const users = await prisma.user.findMany({
    where: { isActive: true, OR: [{ role: "ADMIN" }, { clientId }] },
    select: { id: true },
  });
  return users.map((u) => u.id).filter((id) => id !== excludeUserId);
}

async function assertClientExists(clientId: string) {
  const exists = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!exists) throw new ServiceError("Cliente inexistente", 404);
}

// ---------------------------------------------------------------------------
// DECLARACIONES
// ---------------------------------------------------------------------------
export type DeclarationInput = {
  clientId?: string | null;
  type: DeclarationType;
  periodMonth?: number | null;
  periodYear: number;
  fileUrl: string;
  fileName: string;
  notes?: string | null;
};

export async function svcCreateDeclaration(actor: Actor, input: DeclarationInput) {
  const clientId = resolveClientId(actor, input.clientId);
  await assertClientExists(clientId);
  if (!DECLARATION_TYPES[input.type]) throw new ServiceError("Tipo de declaración inválido");
  if (!input.periodYear) throw new ServiceError("Indicá el año del período");

  const decl = await prisma.declaration.create({
    data: {
      clientId,
      type: input.type,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth ?? null,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      notes: input.notes ?? null,
      uploadedById: actor.userId,
      uploadedRole: actor.role,
    },
  });

  await notifyUsers(await recipientsForClient(clientId, actor.userId), {
    type: "DECLARATION",
    title: `Nueva declaración: ${DECLARATION_TYPES[input.type].label}`,
    message: `Se cargó ${DECLARATION_TYPES[input.type].label} (${periodoLabel(input.periodMonth, input.periodYear)}).`,
    link: actor.role === "ADMIN" ? "/portal/declaraciones" : `/admin/clientes/${clientId}`,
  });

  return decl;
}

export async function svcDeleteDeclaration(actor: Actor, id: string) {
  const decl = await prisma.declaration.findUnique({ where: { id } });
  if (!decl) throw new ServiceError("Declaración inexistente", 404);
  resolveClientId(actor, decl.clientId);
  await deleteFile(decl.fileUrl);
  await prisma.declaration.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// SINDICATOS
// ---------------------------------------------------------------------------
export type UnionInput = {
  clientId?: string | null;
  title: string;
  description?: string | null;
  periodMonth?: number | null;
  periodYear: number;
  amount?: number | null;
  fileUrl?: string | null;
  fileName?: string | null;
};

export async function svcCreateUnionItem(actor: Actor, input: UnionInput) {
  const clientId = resolveClientId(actor, input.clientId);
  await assertClientExists(clientId);
  if (!input.title?.trim()) throw new ServiceError("Indicá un título");
  if (!input.periodYear) throw new ServiceError("Indicá el año del período");

  const item = await prisma.unionItem.create({
    data: {
      clientId,
      title: input.title.trim(),
      description: input.description ?? null,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth ?? null,
      amount: input.amount ?? undefined,
      fileUrl: input.fileUrl ?? null,
      fileName: input.fileName ?? null,
      createdById: actor.userId,
      createdRole: actor.role,
    },
  });

  await notifyUsers(await recipientsForClient(clientId, actor.userId), {
    type: "UNION",
    title: "Nuevo sindicato cargado",
    message: `${item.title} (${periodoLabel(input.periodMonth, input.periodYear)}).`,
    link: actor.role === "ADMIN" ? "/portal/sindicatos" : `/admin/clientes/${clientId}`,
  });

  return item;
}

export async function svcSetUnionPaid(actor: Actor, id: string, paid: boolean) {
  const item = await prisma.unionItem.findUnique({ where: { id } });
  if (!item) throw new ServiceError("Aporte inexistente", 404);
  resolveClientId(actor, item.clientId);

  const updated = await prisma.unionItem.update({
    where: { id },
    data: { isPaid: paid, paidAt: paid ? new Date() : null, paidById: paid ? actor.userId : null },
  });

  if (paid) {
    const admins = await getAdminUserIds();
    await notifyUsers(
      admins.filter((a) => a !== actor.userId),
      {
        type: "UNION",
        title: "Sindicato marcado como pagado",
        message: `${item.title} (${periodoLabel(item.periodMonth, item.periodYear)}) fue marcado como pagado.`,
        link: `/admin/clientes/${item.clientId}`,
      }
    );
  }

  return updated;
}

export async function svcDeleteUnionItem(actor: Actor, id: string) {
  const item = await prisma.unionItem.findUnique({ where: { id } });
  if (!item) throw new ServiceError("Aporte inexistente", 404);
  resolveClientId(actor, item.clientId);
  if (item.fileUrl) await deleteFile(item.fileUrl);
  await prisma.unionItem.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// EMPLEADOS Y RECIBOS
// ---------------------------------------------------------------------------
export type EmployeeInput = {
  clientId?: string | null;
  name: string;
  cuil?: string | null;
  position?: string | null;
};

export async function svcCreateEmployee(actor: Actor, input: EmployeeInput) {
  const clientId = resolveClientId(actor, input.clientId);
  await assertClientExists(clientId);
  if (!input.name?.trim()) throw new ServiceError("Indicá el nombre del empleado");

  return prisma.employee.create({
    data: {
      clientId,
      name: input.name.trim(),
      cuil: input.cuil ?? null,
      position: input.position ?? null,
    },
  });
}

export type PayslipInput = {
  employeeId: string;
  periodMonth: number;
  periodYear: number;
  fileUrl: string;
  fileName: string;
  netAmount?: number | null;
};

export async function svcCreatePayslip(actor: Actor, input: PayslipInput) {
  const employee = await prisma.employee.findUnique({ where: { id: input.employeeId } });
  if (!employee) throw new ServiceError("Empleado inexistente", 404);
  const clientId = resolveClientId(actor, employee.clientId);
  if (!input.periodYear || !input.periodMonth)
    throw new ServiceError("Indicá mes y año del recibo");

  const slip = await prisma.payslip.create({
    data: {
      employeeId: input.employeeId,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      netAmount: input.netAmount ?? undefined,
      uploadedById: actor.userId,
      uploadedRole: actor.role,
    },
  });

  await notifyUsers(await recipientsForClient(clientId, actor.userId), {
    type: "PAYSLIP",
    title: "Nuevo recibo de sueldo",
    message: `Recibo de ${employee.name} (${periodoLabel(input.periodMonth, input.periodYear)}).`,
    link: actor.role === "ADMIN" ? "/portal/recibos" : `/admin/clientes/${clientId}`,
  });

  return slip;
}

export async function svcDeletePayslip(actor: Actor, id: string) {
  const slip = await prisma.payslip.findUnique({ where: { id }, include: { employee: true } });
  if (!slip) throw new ServiceError("Recibo inexistente", 404);
  resolveClientId(actor, slip.employee.clientId);
  await deleteFile(slip.fileUrl);
  await prisma.payslip.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// CONSULTAS
// ---------------------------------------------------------------------------
export async function svcCreateInquiry(
  actor: Actor,
  input: { clientId?: string | null; subject: string; message: string }
) {
  const clientId = resolveClientId(actor, input.clientId);
  if (!input.subject?.trim() || !input.message?.trim())
    throw new ServiceError("Completá asunto y mensaje");

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new ServiceError("Cliente inexistente", 404);

  const inquiry = await prisma.inquiry.create({
    data: {
      clientId,
      subject: input.subject.trim(),
      message: input.message.trim(),
      createdById: actor.userId,
    },
  });

  const admins = await getAdminUserIds();
  await notifyUsers(admins, {
    type: "INQUIRY",
    title: "Nueva consulta",
    message: `${client.name}: ${inquiry.subject}`,
    link: "/admin/consultas",
  });

  const setting = await prisma.setting.findUnique({ where: { key: SETTING_KEYS.INQUIRY_EMAIL } });
  if (setting?.value) {
    // El email es best-effort: si falla, la consulta igual queda registrada.
    try {
      await sendEmail({
        to: setting.value,
        replyTo: client.email ?? undefined,
        subject: `[Consulta] ${client.name}: ${inquiry.subject}`,
        html: emailLayout(
          `Consulta de ${client.name}`,
          `<p><strong>Asunto:</strong> ${inquiry.subject}</p>
           <hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0" />
           <p>${inquiry.message.replace(/\n/g, "<br/>")}</p>`
        ),
      });
    } catch (e) {
      console.error("[inquiry] no se pudo enviar el email de aviso:", e);
    }
  }

  return inquiry;
}

export async function svcRespondInquiry(actor: Actor, id: string, response: string) {
  if (actor.role !== "ADMIN") throw new ServiceError("No autorizado", 403);
  if (!response?.trim()) throw new ServiceError("Escribí una respuesta");

  const inquiry = await prisma.inquiry.update({
    where: { id },
    data: { response: response.trim(), status: "ANSWERED", respondedAt: new Date() },
  });

  const recipients = await prisma.user.findMany({
    where: { clientId: inquiry.clientId, isActive: true },
    select: { id: true },
  });
  await notifyUsers(
    recipients.map((r) => r.id),
    { type: "INQUIRY", title: "Respondieron tu consulta", message: inquiry.subject, link: "/portal/consultas" }
  );

  return inquiry;
}
