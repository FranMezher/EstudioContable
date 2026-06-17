import { auth } from "@/auth";
import { redirect } from "next/navigation";

/** Devuelve la sesión o redirige al login si no hay usuario. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

/** Exige rol ADMIN. Si es cliente, lo manda a su tablero. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/portal");
  return user;
}

/** Exige rol CLIENT con un clientId asociado. */
export async function requireClient() {
  const user = await requireUser();
  if (user.role !== "CLIENT" || !user.clientId) redirect("/admin");
  return { ...user, clientId: user.clientId };
}
