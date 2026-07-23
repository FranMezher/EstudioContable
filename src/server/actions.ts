"use server";

import { revalidatePath } from "next/cache";
import { getSessionScope } from "@/server/access";
import { ServiceError } from "@/server/scope";
import {
  svcCreateCompany,
  svcCreateEmployee,
  svcCreatePayslip,
  svcCreateUser,
  svcDeletePayslip,
  svcResetPassword,
  svcSetUserActive,
  svcUpdateCompany,
  svcUpdateEmployee,
  svcChangeOwnPassword,
} from "@/server/services";
import type { Role } from "@/generated/prisma/enums";

export type ActionState = {
  ok?: boolean;
  error?: string;
  /** Contraseña provisoria, para mostrarla una sola vez. */
  password?: string;
};

function revalidateAll() {
  revalidatePath("/estudio", "layout");
  revalidatePath("/empresa", "layout");
  revalidatePath("/mis-recibos", "layout");
}

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function num(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (!v) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function fail(e: unknown, fallback: string): ActionState {
  if (e instanceof ServiceError) return { error: e.message };
  if (e instanceof Error) return { error: e.message };
  return { error: fallback };
}

// ---------------------------------------------------------------------------
// EMPRESAS
// ---------------------------------------------------------------------------

export async function createCompany(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await getSessionScope();
    await svcCreateCompany(actor, {
      name: str(formData, "name"),
      cuit: str(formData, "cuit") || null,
      email: str(formData, "email") || null,
      phone: str(formData, "phone") || null,
    });
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e, "No se pudo crear la empresa");
  }
}

export async function updateCompany(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await getSessionScope();
    await svcUpdateCompany(actor, str(formData, "companyId"), {
      name: str(formData, "name"),
      email: str(formData, "email") || null,
      phone: str(formData, "phone") || null,
      notes: str(formData, "notes") || null,
    });
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e, "No se pudo actualizar la empresa");
  }
}

// ---------------------------------------------------------------------------
// EMPLEADOS
// ---------------------------------------------------------------------------

export async function createEmployee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await getSessionScope();
    await svcCreateEmployee(actor, {
      // El companyId del formulario se valida contra el alcance; si el usuario
      // es admin de empresa, el suyo gana y un id ajeno da 404.
      companyId: str(formData, "companyId") || null,
      name: str(formData, "name"),
      cuil: str(formData, "cuil"),
      position: str(formData, "position") || null,
    });
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e, "No se pudo crear el empleado");
  }
}

export async function updateEmployee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await getSessionScope();
    await svcUpdateEmployee(actor, str(formData, "employeeId"), {
      name: str(formData, "name"),
      position: str(formData, "position") || null,
    });
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e, "No se pudo actualizar el empleado");
  }
}

// ---------------------------------------------------------------------------
// RECIBOS
// ---------------------------------------------------------------------------

export async function uploadPayslip(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await getSessionScope();

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Tenés que adjuntar el archivo del recibo" };
    }
    if (file.size > 10 * 1024 * 1024) {
      return { error: "El archivo no puede superar los 10 MB" };
    }

    const periodMonth = num(formData, "periodMonth");
    const periodYear = num(formData, "periodYear");
    if (!periodMonth || !periodYear) {
      return { error: "Indicá mes y año del recibo" };
    }

    await svcCreatePayslip(actor, {
      employeeId: str(formData, "employeeId"),
      periodMonth,
      periodYear,
      file,
      fileName: file.name,
      netAmount: num(formData, "netAmount"),
      source: "MANUAL",
    });

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e, "No se pudo subir el recibo");
  }
}

export async function deletePayslip(payslipId: string): Promise<ActionState> {
  try {
    await svcDeletePayslip(await getSessionScope(), payslipId);
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e, "No se pudo eliminar el recibo");
  }
}

// ---------------------------------------------------------------------------
// ACCESOS
// ---------------------------------------------------------------------------

export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await getSessionScope();
    const { password } = await svcCreateUser(actor, {
      role: str(formData, "role") as Role,
      name: str(formData, "name"),
      email: str(formData, "email") || null,
      companyId: str(formData, "companyId") || null,
      employeeId: str(formData, "employeeId") || null,
    });
    revalidateAll();
    return { ok: true, password };
  } catch (e) {
    return fail(e, "No se pudo crear el acceso");
  }
}

export async function resetUserPassword(userId: string): Promise<ActionState> {
  try {
    const password = await svcResetPassword(await getSessionScope(), userId);
    revalidateAll();
    return { ok: true, password };
  } catch (e) {
    return fail(e, "No se pudo restablecer la contraseña");
  }
}

export async function setUserActive(userId: string, isActive: boolean): Promise<ActionState> {
  try {
    await svcSetUserActive(await getSessionScope(), userId, isActive);
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e, "No se pudo actualizar el acceso");
  }
}

/** Cambio de contraseña propio: disponible para todos los roles. */
export async function changeOwnPassword(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { userId } = await getSessionScope();
    const nueva = str(formData, "newPassword");
    if (nueva !== str(formData, "confirmPassword")) {
      return { error: "Las contraseñas nuevas no coinciden" };
    }
    await svcChangeOwnPassword(userId, str(formData, "currentPassword"), nueva);
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e, "No se pudo cambiar la contraseña");
  }
}
