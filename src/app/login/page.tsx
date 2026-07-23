import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BRAND } from "@/lib/constants";
import { BrandMark } from "@/components/brand";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 to-brand-600 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark size="lg" className="mb-3" />
          <h1 className="text-2xl font-bold text-white">{BRAND.name}</h1>
          <p className="mt-1 text-sm text-brand-100">{BRAND.tagline}</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <h2 className="mb-1 text-lg font-semibold text-slate-800">Iniciar sesión</h2>
          <p className="mb-6 text-sm text-slate-500">
            Ingresá con los datos que te dio el estudio.
          </p>
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-brand-100">
          © {new Date().getFullYear()} Estudio {BRAND.name}
        </p>
      </div>
    </div>
  );
}
