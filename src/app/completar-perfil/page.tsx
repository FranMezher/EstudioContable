import { redirect } from "next/navigation";
import { BRAND } from "@/lib/constants";
import { BrandMark } from "@/components/brand";
import { requireUser } from "@/lib/session";
import { homeFor } from "@/server/scope";
import { CompleteProfileForm } from "./complete-profile-form";

export default async function CompletarPerfilPage() {
  const user = await requireUser();
  // La contraseña va primero.
  if (user.mustChangePassword) redirect("/cambiar-clave");
  // Si no está pendiente (ya lo completó, o no es empleado), no tiene nada que hacer acá.
  if (!user.profilePending) redirect(homeFor(user.role));

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 to-brand-600 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark size="lg" className="mb-3" />
          <h1 className="text-2xl font-bold text-white">{BRAND.name}</h1>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <h2 className="mb-1 text-lg font-semibold text-slate-800">Completá tus datos</h2>
          <p className="mb-6 text-sm text-slate-500">
            Es la primera vez que ingresás. Cargá tus datos personales para terminar. Después no vas
            a poder modificarlos: si algo cambia, lo actualiza el estudio.
          </p>
          <CompleteProfileForm />
        </div>
      </div>
    </div>
  );
}
