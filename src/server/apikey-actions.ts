"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/server/access";
import { assertStudio, ServiceError } from "@/server/scope";
import { generateApiKey } from "@/server/api/http";
import type { ActionState } from "@/server/actions";

export type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  company: string | null;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

export async function listApiKeys(): Promise<ApiKeyRow[]> {
  const { scope } = await getSessionScope();
  assertStudio(scope);
  const rows = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    include: { company: { select: { name: true } } },
  });
  return rows.map((k) => ({
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    company: k.company?.name ?? null,
    isActive: k.isActive,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
  }));
}

/** Crea una API key. La clave completa se devuelve una sola vez. */
export async function createApiKey(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState & { apiKey?: string }> {
  try {
    const { userId, scope } = await getSessionScope();
    assertStudio(scope);

    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Poné una etiqueta para reconocer la key" };

    const companyId = String(formData.get("companyId") ?? "").trim() || null;
    if (companyId) {
      const exists = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true },
      });
      if (!exists) return { error: "La empresa elegida no existe" };
    }

    const { fullKey, prefix, keyHash } = generateApiKey();
    await prisma.apiKey.create({
      data: { name, prefix, keyHash, companyId, createdById: userId },
    });

    revalidatePath("/estudio/configuracion");
    return { ok: true, apiKey: fullKey };
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    return { error: "No se pudo crear la API key" };
  }
}

export async function revokeApiKey(id: string): Promise<ActionState> {
  try {
    const { scope } = await getSessionScope();
    assertStudio(scope);
    await prisma.apiKey.update({ where: { id }, data: { isActive: false } });
    revalidatePath("/estudio/configuracion");
    return { ok: true };
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    return { error: "No se pudo desactivar la API key" };
  }
}
