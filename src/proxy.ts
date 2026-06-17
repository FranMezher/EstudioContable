import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Protege las páginas web. Excluye /api (cada endpoint maneja su propia
  // autenticación: /api/auth con sesión, /api/v1 con API key Bearer) y los assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)"],
};
