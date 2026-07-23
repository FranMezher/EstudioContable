import { prisma } from "@/lib/prisma";
import type { Scope } from "@/server/scope";
import type { Role } from "@/generated/prisma/enums";

export type UserRow = {
  id: string;
  name: string;
  role: Role;
  email: string | null;
  cuil: string | null;
  company: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
};

/**
 * Usuarios visibles según el alcance. El admin de empresa ve solo los de su
 * empresa y nunca a los del estudio.
 */
export async function getUsers(scope: Scope): Promise<UserRow[]> {
  if (scope.kind === "employee") return [];

  const rows = await prisma.user.findMany({
    where:
      scope.kind === "studio"
        ? {}
        : { companyId: scope.companyId, role: { not: "STUDIO_ADMIN" } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { company: { select: { name: true } } },
  });

  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    email: u.email,
    cuil: u.cuil,
    company: u.company?.name ?? null,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    mustChangePassword: u.mustChangePassword,
  }));
}
