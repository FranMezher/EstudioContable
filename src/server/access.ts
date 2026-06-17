import { auth } from "@/auth";
import type { Actor } from "@/server/services";

export async function getActor() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  return session.user;
}

/** Construye un Actor (identidad uniforme) a partir de la sesión web. */
export async function getSessionActor(): Promise<Actor> {
  const user = await getActor();
  return { userId: user.id, role: user.role, clientId: user.clientId ?? null };
}
