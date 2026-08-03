import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { homeFor } from "@/server/scope";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) redirect("/cambiar-clave");
  if (session.user.profilePending) redirect("/completar-perfil");
  redirect(homeFor(session.user.role));
}
