import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { normalizeCuil } from "@/lib/constants";

const credentialsSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

/**
 * Los admins entran con email y los empleados con CUIL, pero el formulario
 * tiene un solo campo. Si al quitar guiones y espacios quedan 11 dígitos,
 * lo tratamos como CUIL; si no, como email.
 */
function parseIdentifier(raw: string): { cuil: string } | { email: string } {
  const digits = normalizeCuil(raw);
  if (digits.length === 11 && !raw.includes("@")) return { cuil: digits };
  return { email: raw.toLowerCase().trim() };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Email o CUIL", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const where = parseIdentifier(parsed.data.identifier);
        const user = await prisma.user.findUnique({ where });
        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        // Un empleado sin legajo asociado no puede resolver su alcance:
        // mejor no dejarlo entrar que dejarlo entrar sin filtro.
        if (user.role === "EMPLOYEE" && (!user.employeeId || !user.companyId)) return null;
        if (user.role === "COMPANY_ADMIN" && !user.companyId) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          employeeId: user.employeeId,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
});
