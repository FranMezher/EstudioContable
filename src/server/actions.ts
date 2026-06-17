"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { uploadFile, deleteFile } from "@/lib/blob";
import { resolveClient, getActor, recipientsForClient } from "@/server/access";
import { notifyUsers, getAdminUserIds } from "@/lib/notifications";
import { sendEmail, emailLayout } from "@/lib/email";
import { SETTING_KEYS, DECLARATION_TYPES, periodoLabel } from "@/lib/constants";
import type { DeclarationType } from "@/generated/prisma/enums";

export type ActionState = { ok?: boolean; error?: string };

function revalidateAll() {
  revalidatePath("/admin", "layout");
  revalidatePath("/portal", "layout");
}

function num(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function requireFile(formData: FormData): File {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Tenés que adjuntar un archivo");
  }
  return file;
}

// ---------------------------------------------------------------------------
// DECLARACIONES JURADAS
// ---------------------------------------------------------------------------
export async function uploadDeclaration(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { clientId, actorRole, userId } = await resolveClient(
      formData.get("clientId") as string | null
    );
    const type = formData.get("type") as DeclarationType;
    if (!DECLARATION_TYPES[type]) throw new Error("Tipo de declaración inválido");

    const periodYear = num(formData.get("periodYear"));
    if (!periodYear) throw new Error("Indicá el año del período");
    const periodMonth = num(formData.get("periodMonth"));

    const file = requireFile(formData);
    const { url, fileName } = await uploadFile(file, { folder: "declaraciones", clientId });

    await prisma.declaration.create({
      data: {
        clientId,
        type,
        periodYear,
        periodMonth,
        fileUrl: url,
        fileName,
        notes: (formData.get("notes") as string) || null,
        uploadedById: userId,
        uploadedRole: actorRole,
      },
    });

    const recipients = await recipientsForClient(clientId, userId);
    await notifyUsers(recipients, {
      type: "DECLARATION",
      title: `Nueva declaración: ${DECLARATION_TYPES[type].label}`,
      message: `Se cargó ${DECLARATION_TYPES[type].label} (${periodoLabel(periodMonth, periodYear)}).`,
      link: actorRole === "ADMIN" ? "/portal/declaraciones" : `/admin/clientes/${clientId}`,
    });

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al subir la declaración" };
  }
}

export async function deleteDeclaration(id: string) {
  const decl = await prisma.declaration.findUnique({ where: { id } });
  if (!decl) return;
  await resolveClient(decl.clientId); // valida permiso
  await deleteFile(decl.fileUrl);
  await prisma.declaration.delete({ where: { id } });
  revalidateAll();
}

// ---------------------------------------------------------------------------
// SINDICATOS
// ---------------------------------------------------------------------------
export async function createUnionItem(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { clientId, actorRole, userId } = await resolveClient(
      formData.get("clientId") as string | null
    );
    const title = (formData.get("title") as string)?.trim();
    if (!title) throw new Error("Indicá un título");

    const periodYear = num(formData.get("periodYear"));
    if (!periodYear) throw new Error("Indicá el año del período");
    const periodMonth = num(formData.get("periodMonth"));
    const amount = num(formData.get("amount"));

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      const up = await uploadFile(file, { folder: "sindicatos", clientId });
      fileUrl = up.url;
      fileName = up.fileName;
    }

    await prisma.unionItem.create({
      data: {
        clientId,
        title,
        description: (formData.get("description") as string) || null,
        periodYear,
        periodMonth,
        amount: amount ?? undefined,
        fileUrl,
        fileName,
        createdById: userId,
        createdRole: actorRole,
      },
    });

    const recipients = await recipientsForClient(clientId, userId);
    await notifyUsers(recipients, {
      type: "UNION",
      title: "Nuevo sindicato cargado",
      message: `${title} (${periodoLabel(periodMonth, periodYear)}).`,
      link: actorRole === "ADMIN" ? "/portal/sindicatos" : `/admin/clientes/${clientId}`,
    });

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al cargar el sindicato" };
  }
}

export async function toggleUnionPaid(id: string, paid: boolean) {
  const item = await prisma.unionItem.findUnique({ where: { id } });
  if (!item) return;
  const { userId } = await resolveClient(item.clientId);

  await prisma.unionItem.update({
    where: { id },
    data: { isPaid: paid, paidAt: paid ? new Date() : null, paidById: paid ? userId : null },
  });

  if (paid) {
    const admins = await getAdminUserIds();
    await notifyUsers(
      admins.filter((a) => a !== userId),
      {
        type: "UNION",
        title: "Sindicato marcado como pagado",
        message: `${item.title} (${periodoLabel(item.periodMonth, item.periodYear)}) fue marcado como pagado.`,
        link: `/admin/clientes/${item.clientId}`,
      }
    );
  }

  revalidateAll();
}

export async function deleteUnionItem(id: string) {
  const item = await prisma.unionItem.findUnique({ where: { id } });
  if (!item) return;
  await resolveClient(item.clientId);
  if (item.fileUrl) await deleteFile(item.fileUrl);
  await prisma.unionItem.delete({ where: { id } });
  revalidateAll();
}

// ---------------------------------------------------------------------------
// EMPLEADOS Y RECIBOS
// ---------------------------------------------------------------------------
export async function createEmployee(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { clientId } = await resolveClient(formData.get("clientId") as string | null);
    const name = (formData.get("name") as string)?.trim();
    if (!name) throw new Error("Indicá el nombre del empleado");

    await prisma.employee.create({
      data: {
        clientId,
        name,
        cuil: (formData.get("cuil") as string) || null,
        position: (formData.get("position") as string) || null,
      },
    });
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al crear el empleado" };
  }
}

export async function uploadPayslip(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const employeeId = formData.get("employeeId") as string;
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new Error("Empleado inexistente");

    const { clientId, actorRole, userId } = await resolveClient(employee.clientId);

    const periodYear = num(formData.get("periodYear"));
    const periodMonth = num(formData.get("periodMonth"));
    if (!periodYear || !periodMonth) throw new Error("Indicá mes y año del recibo");

    const file = requireFile(formData);
    const { url, fileName } = await uploadFile(file, { folder: "recibos", clientId });

    await prisma.payslip.create({
      data: {
        employeeId,
        periodYear,
        periodMonth,
        fileUrl: url,
        fileName,
        netAmount: num(formData.get("netAmount")) ?? undefined,
        uploadedById: userId,
        uploadedRole: actorRole,
      },
    });

    const recipients = await recipientsForClient(clientId, userId);
    await notifyUsers(recipients, {
      type: "PAYSLIP",
      title: "Nuevo recibo de sueldo",
      message: `Recibo de ${employee.name} (${periodoLabel(periodMonth, periodYear)}).`,
      link: actorRole === "ADMIN" ? "/portal/recibos" : `/admin/clientes/${clientId}`,
    });

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al subir el recibo" };
  }
}

export async function deletePayslip(id: string) {
  const slip = await prisma.payslip.findUnique({
    where: { id },
    include: { employee: true },
  });
  if (!slip) return;
  await resolveClient(slip.employee.clientId);
  await deleteFile(slip.fileUrl);
  await prisma.payslip.delete({ where: { id } });
  revalidateAll();
}

// ---------------------------------------------------------------------------
// CONSULTAS
// ---------------------------------------------------------------------------
export async function createInquiry(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await getActor();
    if (user.role !== "CLIENT" || !user.clientId) {
      throw new Error("Solo los clientes pueden enviar consultas");
    }
    const subject = (formData.get("subject") as string)?.trim();
    const message = (formData.get("message") as string)?.trim();
    if (!subject || !message) throw new Error("Completá asunto y mensaje");

    const client = await prisma.client.findUnique({ where: { id: user.clientId } });

    await prisma.inquiry.create({
      data: { clientId: user.clientId, subject, message, createdById: user.id },
    });

    // Notificar a los admins (in-app)
    const admins = await getAdminUserIds();
    await notifyUsers(admins, {
      type: "INQUIRY",
      title: "Nueva consulta",
      message: `${client?.name ?? "Un cliente"}: ${subject}`,
      link: "/admin/consultas",
    });

    // Email al destino configurado
    const setting = await prisma.setting.findUnique({
      where: { key: SETTING_KEYS.INQUIRY_EMAIL },
    });
    if (setting?.value) {
      await sendEmail({
        to: setting.value,
        replyTo: client?.email ?? undefined,
        subject: `[Consulta] ${client?.name ?? "Cliente"}: ${subject}`,
        html: emailLayout(
          `Consulta de ${client?.name ?? "un cliente"}`,
          `<p><strong>Asunto:</strong> ${subject}</p>
           <p><strong>Usuario:</strong> ${user.name} (${user.email})</p>
           <hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0" />
           <p>${message.replace(/\n/g, "<br/>")}</p>`
        ),
      });
    }

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al enviar la consulta" };
  }
}

export async function respondInquiry(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await getActor();
    if (user.role !== "ADMIN") throw new Error("No autorizado");

    const id = formData.get("id") as string;
    const response = (formData.get("response") as string)?.trim();
    if (!response) throw new Error("Escribí una respuesta");

    const inquiry = await prisma.inquiry.update({
      where: { id },
      data: { response, status: "ANSWERED", respondedAt: new Date() },
    });

    // Notificar a los usuarios del cliente
    const recipients = await prisma.user.findMany({
      where: { clientId: inquiry.clientId, isActive: true },
      select: { id: true },
    });
    await notifyUsers(
      recipients.map((r) => r.id),
      {
        type: "INQUIRY",
        title: "Respondieron tu consulta",
        message: inquiry.subject,
        link: "/portal/consultas",
      }
    );

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al responder" };
  }
}
