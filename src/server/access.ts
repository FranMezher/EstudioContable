import { auth } from "@/auth";
import { scopeFor, ServiceError, type Scope } from "@/server/scope";

/**
 * Alcance del usuario logueado, para usar en server actions.
 * A diferencia de `requireSession()` (que redirige), acá se tira un error:
 * las acciones lo devuelven al formulario en vez de navegar.
 */
export async function getSessionScope(): Promise<{ userId: string; scope: Scope }> {
  const session = await auth();
  if (!session?.user) throw new ServiceError("No autenticado", 401);
  return {
    userId: session.user.id,
    scope: scopeFor(session.user),
  };
}
