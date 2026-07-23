import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { scopeFor, homeFor, type Scope } from "@/server/scope";
import type { Role } from "@/generated/prisma/enums";

export type SessionUser = {
  id: string;
  name: string;
  role: Role;
  companyId: string | null;
  employeeId: string | null;
  mustChangePassword: boolean;
};

/** Devuelve la sesión o redirige al login. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const u = session.user;
  return {
    id: u.id,
    name: u.name ?? "",
    role: u.role,
    companyId: u.companyId,
    employeeId: u.employeeId,
    mustChangePassword: u.mustChangePassword,
  };
}

/**
 * Usuario + alcance, con el cambio de contraseña forzado ya resuelto.
 * Es el punto de entrada de todas las páginas privadas.
 */
export async function requireSession(): Promise<{ user: SessionUser; scope: Scope }> {
  const user = await requireUser();
  if (user.mustChangePassword) redirect("/cambiar-clave");
  return { user, scope: scopeFor(user) };
}

/**
 * Exige un rol determinado. Si no coincide, manda al usuario a SU inicio
 * en vez de mostrar un error: no hay razón para contarle qué existe del
 * otro lado.
 */
async function requireRole(role: Role) {
  const { user, scope } = await requireSession();
  if (user.role !== role) redirect(homeFor(user.role));
  return { user, scope };
}

export async function requireStudio() {
  const { user, scope } = await requireRole("STUDIO_ADMIN");
  return { user, scope };
}

export async function requireCompanyAdmin() {
  const { user, scope } = await requireRole("COMPANY_ADMIN");
  if (scope.kind !== "company") redirect(homeFor(user.role));
  return { user, scope, companyId: scope.companyId };
}

export async function requireEmployee() {
  const { user, scope } = await requireRole("EMPLOYEE");
  if (scope.kind !== "employee") redirect(homeFor(user.role));
  return { user, scope, employeeId: scope.employeeId };
}
