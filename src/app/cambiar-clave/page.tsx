import { BRAND } from "@/lib/constants";
import { BrandMark } from "@/components/brand";
import { requireUser } from "@/lib/session";
import { ChangePasswordForm } from "./change-password-form";

export default async function CambiarClavePage() {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 to-brand-600 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark size="lg" className="mb-3" />
          <h1 className="text-2xl font-bold text-white">{BRAND.name}</h1>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <h2 className="mb-1 text-lg font-semibold text-slate-800">
            {user.mustChangePassword ? "Elegí tu contraseña" : "Cambiar contraseña"}
          </h2>
          <p className="mb-6 text-sm text-slate-500">
            {user.mustChangePassword
              ? "Por seguridad, cambiá la contraseña provisoria antes de continuar."
              : "Ingresá tu contraseña actual y la nueva."}
          </p>
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
