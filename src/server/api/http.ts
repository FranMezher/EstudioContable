import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { uploadBuffer } from "@/lib/blob";
import { ServiceError, type Actor } from "@/server/services";

const KEY_PREFIX = "mp_live_";

/** Genera una API key nueva. La clave completa se muestra una sola vez. */
export function generateApiKey() {
  const secret = crypto.randomBytes(24).toString("hex");
  const fullKey = `${KEY_PREFIX}${secret}`;
  return {
    fullKey,
    prefix: fullKey.slice(0, 14),
    keyHash: hashKey(fullKey),
  };
}

export function hashKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/** Valida el header Authorization: Bearer <key> y devuelve el Actor. */
export async function authenticateRequest(req: Request): Promise<Actor> {
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) {
    throw new ServiceError("Falta el header Authorization: Bearer <api_key>", 401);
  }
  const key = header.slice(7).trim();
  const record = await prisma.apiKey.findUnique({ where: { keyHash: hashKey(key) } });
  if (!record || !record.isActive) {
    throw new ServiceError("API key inválida o desactivada", 401);
  }

  await prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    userId: record.createdById,
    role: record.clientId ? "CLIENT" : "ADMIN",
    clientId: record.clientId,
  };
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: { message } }, { status });
}

/**
 * Envuelve un handler de API: autentica, ejecuta y normaliza errores a JSON.
 */
export function withApi(
  handler: (ctx: { req: Request; actor: Actor; params: Record<string, string> }) => Promise<NextResponse>
) {
  return async (
    req: Request,
    context: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    try {
      const actor = await authenticateRequest(req);
      const params = context?.params ? await context.params : {};
      return await handler({ req, actor, params });
    } catch (e) {
      if (e instanceof ServiceError) return fail(e.message, e.status);
      console.error("[api] error:", e);
      return fail("Error interno del servidor", 500);
    }
  };
}

/** Parsea el body JSON de forma segura. */
export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ServiceError("Body JSON inválido", 400);
  }
}

/**
 * Resuelve un archivo recibido por API. Acepta:
 *  - { fileUrl }            → se usa la URL tal cual (ya hosteada)
 *  - { fileBase64, fileName } → se sube a Vercel Blob
 */
export async function resolveApiFile(
  input: { fileUrl?: string | null; fileBase64?: string | null; fileName?: string | null },
  opts: { folder: string; clientId: string; required?: boolean }
): Promise<{ url: string; fileName: string } | null> {
  if (input.fileUrl) {
    return { url: input.fileUrl, fileName: input.fileName ?? input.fileUrl.split("/").pop() ?? "archivo" };
  }
  if (input.fileBase64) {
    if (!input.fileName) throw new ServiceError("Falta fileName para el archivo en base64", 400);
    const base64 = input.fileBase64.includes(",")
      ? input.fileBase64.slice(input.fileBase64.indexOf(",") + 1)
      : input.fileBase64;
    const buffer = Buffer.from(base64, "base64");
    return uploadBuffer(buffer, input.fileName, { folder: opts.folder, clientId: opts.clientId });
  }
  if (opts.required) throw new ServiceError("Tenés que enviar fileUrl o fileBase64+fileName", 400);
  return null;
}
