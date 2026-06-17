import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getActor() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  return session.user;
}

/**
 * Resuelve sobre qué cliente se opera y valida permisos.
 * - ADMIN: debe indicar `requested` (el cliente que está gestionando).
 * - CLIENT: siempre su propio cliente; no puede tocar otro.
 */
export async function resolveClient(requested?: string | null) {
  const user = await getActor();

  if (user.role === "ADMIN") {
    if (!requested) throw new Error("Falta indicar el cliente");
    return { clientId: requested, actorRole: "ADMIN" as const, userId: user.id };
  }

  if (!user.clientId) throw new Error("El usuario no tiene un cliente asociado");
  if (requested && requested !== user.clientId) throw new Error("Acceso no autorizado");
  return { clientId: user.clientId, actorRole: "CLIENT" as const, userId: user.id };
}

/** Lista de usuarios (admins + usuarios del cliente) para notificar sobre un cliente. */
export async function recipientsForClient(clientId: string, excludeUserId?: string) {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [{ role: "ADMIN" }, { clientId }],
    },
    select: { id: true },
  });
  return users.map((u) => u.id).filter((id) => id !== excludeUserId);
}
