import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { Building2 } from "lucide-react";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 to-brand-600 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Estudio Mezher Pampin</h1>
          <p className="mt-1 text-sm text-brand-100">Portal de gestión de clientes</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <h2 className="mb-1 text-lg font-semibold text-slate-800">Iniciar sesión</h2>
          <p className="mb-6 text-sm text-slate-500">
            Ingresá con las credenciales que te dio el estudio.
          </p>
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-brand-100">
          © {new Date().getFullYear()} Estudio Mezher Pampin
        </p>
      </div>
    </div>
  );
}
