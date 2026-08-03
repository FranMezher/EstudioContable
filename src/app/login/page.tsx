import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <AuthShell title="Iniciar sesión" subtitle="Ingresá con los datos que te dio el estudio.">
      <LoginForm />
    </AuthShell>
  );
}
