import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

/**
 * Configuración base de Auth.js, segura para el edge runtime (proxy).
 * No incluye el provider de credenciales (que usa prisma/bcrypt y solo corre en Node).
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.name = user.name;
        token.companyId = user.companyId ?? null;
        token.employeeId = user.employeeId ?? null;
        token.mustChangePassword = user.mustChangePassword ?? false;
        token.profilePending = user.profilePending ?? false;
      }
      // Las pantallas de onboarding llaman a update() para bajar estos flags
      // sin obligar a volver a loguearse.
      if (trigger === "update" && session?.mustChangePassword === false) {
        token.mustChangePassword = false;
      }
      if (trigger === "update" && session?.profilePending === false) {
        token.profilePending = false;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.companyId = (token.companyId as string | null) ?? null;
        session.user.employeeId = (token.employeeId as string | null) ?? null;
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
        session.user.profilePending = Boolean(token.profilePending);
      }
      return session;
    },
    /**
     * Chequeo optimista en el proxy: solo decide "hay sesión o no".
     * El control real por rol vive en los layouts del servidor
     * (src/lib/session.ts), que es donde se puede consultar la base.
     */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      const isPublic =
        pathname === "/login" ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/_next");

      if (isPublic) return true;
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
