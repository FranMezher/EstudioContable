import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { ServiceError, scopeFor } from "@/server/scope";
import type { Actor } from "@/server/services";

const KEY_PREFIX = "mp_live_";

/** Genera una API key nueva. La clave completa se muestra una sola vez. */
export function generateApiKey() {
  const secret = crypto.randomBytes(24).toString("hex");
  const fullKey = `${KEY_PREFIX}${secret}`;
  return { fullKey, prefix: fullKey.slice(0, 14), keyHash: hashKey(fullKey) };
}

export function hashKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Valida `Authorization: Bearer <key>` y devuelve el Actor.
 * Una key sin empresa tiene alcance de estudio; una key con empresa queda
 * limitada a esa empresa, con el mismo filtro que usa la web.
 */
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

  await prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });

  return {
    userId: record.createdById,
    scope: scopeFor({
      role: record.companyId ? "COMPANY_ADMIN" : "STUDIO_ADMIN",
      companyId: record.companyId,
    }),
  };
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: { message } }, { status });
}

/** Envuelve un handler de API: autentica, ejecuta y normaliza errores a JSON. */
export function withApi(
  handler: (ctx: {
    req: Request;
    actor: Actor;
    params: Record<string, string>;
  }) => Promise<NextResponse>
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

/** Decodifica un archivo enviado en base64. */
export function decodeBase64File(input: string): Buffer {
  const base64 = input.includes(",") ? input.slice(input.indexOf(",") + 1) : input;
  const buffer = Buffer.from(base64, "base64");
  if (buffer.byteLength === 0) throw new ServiceError("El archivo llegó vacío", 400);
  if (buffer.byteLength > 10 * 1024 * 1024)
    throw new ServiceError("El archivo supera los 10 MB", 400);
  return buffer;
}
