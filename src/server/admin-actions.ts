"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/server/access";
import { SETTING_KEYS } from "@/lib/constants";
import { sendEmail, emailLayout } from "@/lib/email";

export type ActionState = { ok?: boolean; error?: string };

async function ensureAdmin() {
  const user = await getActor();
  if (user.role !== "ADMIN") throw new Error("No autorizado");
  return user;
}

/** Crea un cliente nuevo junto con su primera cuenta de acceso. */
export async function createClient(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await ensureAdmin();

    const name = (formData.get("name") as string)?.trim();
    if (!name) throw new Error("Indicá la razón social / nombre");

    const userName = (formData.get("userName") as string)?.trim();
    const userEmail = (formData.get("userEmail") as string)?.trim().toLowerCase();
    const userPassword = formData.get("userPassword") as string;

    if (!userName || !userEmail || !userPassword) {
      throw new Error("Completá los datos de acceso del cliente");
    }
    if (userPassword.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres");

    const existing = await prisma.user.findUnique({ where: { email: userEmail } });
    if (existing) throw new Error("Ya existe un usuario con ese email");

    const passwordHash = await bcrypt.hash(userPassword, 10);

    const client = await prisma.client.create({
      data: {
        name,
        cuit: (formData.get("cuit") as string) || null,
        email: (formData.get("email") as string) || null,
        phone: (formData.get("phone") as string) || null,
        users: {
          create: { name: userName, email: userEmail, passwordHash, role: "CLIENT" },
        },
      },
    });

    revalidatePath("/admin/clientes");
    return { ok: true, error: client.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al crear el cliente" };
  }
}

/** Agrega una cuenta de acceso adicional a un cliente existente. */
export async function addClientUser(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await ensureAdmin();
    const clientId = formData.get("clientId") as string;
    const name = (formData.get("name") as string)?.trim();
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const password = formData.get("password") as string;

    if (!name || !email || !password) throw new Error("Completá todos los campos");
    if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres");

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("Ya existe un usuario con ese email");

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { name, email, passwordHash, role: "CLIENT", clientId },
    });

    revalidatePath(`/admin/clientes/${clientId}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al crear el usuario" };
  }
}

/** Activa o desactiva una cuenta de usuario. */
export async function toggleUserActive(userId: string, active: boolean) {
  await ensureAdmin();
  await prisma.user.update({ where: { id: userId }, data: { isActive: active } });
  revalidatePath("/admin/clientes", "layout");
}

/** Resetea la contraseña de un usuario. */
export async function resetUserPassword(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await ensureAdmin();
    const userId = formData.get("userId") as string;
    const password = formData.get("password") as string;
    if (!password || password.length < 6)
      throw new Error("La contraseña debe tener al menos 6 caracteres");
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al cambiar la contraseña" };
  }
}

/** Configura el email destino de las consultas. */
export async function setInquiryEmail(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await ensureAdmin();
    const value = (formData.get("email") as string)?.trim().toLowerCase();
    if (!value || !value.includes("@")) throw new Error("Ingresá un email válido");

    await prisma.setting.upsert({
      where: { key: SETTING_KEYS.INQUIRY_EMAIL },
      update: { value },
      create: { key: SETTING_KEYS.INQUIRY_EMAIL, value },
    });
    revalidatePath("/admin/configuracion");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al guardar" };
  }
}

/** Envía un email de prueba para validar la configuración de Resend. */
export async function sendTestEmail(_prev: ActionState): Promise<ActionState> {
  try {
    const admin = await ensureAdmin();
    const setting = await prisma.setting.findUnique({
      where: { key: SETTING_KEYS.INQUIRY_EMAIL },
    });
    const to = setting?.value ?? admin.email!;
    const res = await sendEmail({
      to,
      subject: "Email de prueba - Estudio Mezher Pampin",
      html: emailLayout("Funciona ✅", "<p>La configuración de emails está operativa.</p>"),
    });
    if (res.skipped) return { error: "No hay RESEND_API_KEY configurada (no se envió)." };
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al enviar" };
  }
}
