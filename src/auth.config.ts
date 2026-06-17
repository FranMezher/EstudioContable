import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

/**
 * Configuración base de Auth.js, segura para el edge runtime (middleware).
 * No incluye el provider de credenciales (que usa prisma/bcrypt y solo corre en Node).
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.clientId = user.clientId ?? null;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.clientId = (token.clientId as string | null) ?? null;
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      const isPublic =
        pathname === "/login" ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/_next");

      if (isPublic) return true;
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
