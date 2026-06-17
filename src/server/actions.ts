"use server";

import { revalidatePath } from "next/cache";
import { uploadFile } from "@/lib/blob";
import { getActor, getSessionActor } from "@/server/access";
import {
  svcCreateDeclaration,
  svcDeleteDeclaration,
  svcCreateUnionItem,
  svcSetUnionPaid,
  svcDeleteUnionItem,
  svcCreateEmployee,
  svcCreatePayslip,
  svcDeletePayslip,
  svcCreateInquiry,
  svcRespondInquiry,
} from "@/server/services";
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

function getFile(formData: FormData, required: boolean): File | null {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    if (required) throw new Error("Tenés que adjuntar un archivo");
    return null;
  }
  return file;
}

function fail(e: unknown, fallback: string): ActionState {
  return { error: e instanceof Error ? e.message : fallback };
}

// ---------------------------------------------------------------------------
// DECLARACIONES
// ---------------------------------------------------------------------------
export async function uploadDeclaration(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const actor = await getSessionActor();
    const clientId = (formData.get("clientId") as string) || actor.clientId;
    const file = getFile(formData, true)!;
    const { url, fileName } = await uploadFile(file, {
      folder: "declaraciones",
      clientId: clientId!,
    });

    await svcCreateDeclaration(actor, {
      clientId,
      type: formData.get("type") as DeclarationType,
      periodYear: num(formData.get("periodYear"))!,
      periodMonth: num(formData.get("periodMonth")),
      fileUrl: url,
      fileName,
      notes: (formData.get("notes") as string) || null,
    });

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e, "Error al subir la declaración");
  }
}

export async function deleteDeclaration(id: string) {
  await svcDeleteDeclaration(await getSessionActor(), id);
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
    const actor = await getSessionActor();
    const clientId = (formData.get("clientId") as string) || actor.clientId;

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    const file = getFile(formData, false);
    if (file) {
      const up = await uploadFile(file, { folder: "sindicatos", clientId: clientId! });
      fileUrl = up.url;
      fileName = up.fileName;
    }

    await svcCreateUnionItem(actor, {
      clientId,
      title: (formData.get("title") as string) ?? "",
      description: (formData.get("description") as string) || null,
      periodYear: num(formData.get("periodYear"))!,
      periodMonth: num(formData.get("periodMonth")),
      amount: num(formData.get("amount")),
      fileUrl,
      fileName,
    });

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e, "Error al cargar el sindicato");
  }
}

export async function toggleUnionPaid(id: string, paid: boolean) {
  await svcSetUnionPaid(await getSessionActor(), id, paid);
  revalidateAll();
}

export async function deleteUnionItem(id: string) {
  await svcDeleteUnionItem(await getSessionActor(), id);
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
    const actor = await getSessionActor();
    await svcCreateEmployee(actor, {
      clientId: (formData.get("clientId") as string) || actor.clientId,
      name: (formData.get("name") as string) ?? "",
      cuil: (formData.get("cuil") as string) || null,
      position: (formData.get("position") as string) || null,
    });
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e, "Error al crear el empleado");
  }
}

export async function uploadPayslip(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const actor = await getSessionActor();
    const employeeId = formData.get("employeeId") as string;
    const clientId = (formData.get("clientId") as string) || actor.clientId || "tmp";
    const file = getFile(formData, true)!;
    const { url, fileName } = await uploadFile(file, { folder: "recibos", clientId });

    await svcCreatePayslip(actor, {
      employeeId,
      periodYear: num(formData.get("periodYear"))!,
      periodMonth: num(formData.get("periodMonth"))!,
      fileUrl: url,
      fileName,
      netAmount: num(formData.get("netAmount")),
    });

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e, "Error al subir el recibo");
  }
}

export async function deletePayslip(id: string) {
  await svcDeletePayslip(await getSessionActor(), id);
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
    const actor = await getSessionActor();
    if (actor.role !== "CLIENT") throw new Error("Solo los clientes pueden enviar consultas");
    await svcCreateInquiry(actor, {
      subject: (formData.get("subject") as string) ?? "",
      message: (formData.get("message") as string) ?? "",
    });
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e, "Error al enviar la consulta");
  }
}

export async function respondInquiry(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const actor = await getActor();
    await svcRespondInquiry(
      { userId: actor.id, role: actor.role, clientId: actor.clientId ?? null },
      formData.get("id") as string,
      (formData.get("response") as string) ?? ""
    );
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e, "Error al responder");
  }
}
