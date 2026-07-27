import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
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
    <AuthShell
      wide
      title="Completá tus datos"
      subtitle="Es la primera vez que ingresás. Cargá tus datos personales para terminar. Después no vas a poder modificarlos: si algo cambia, lo actualiza el estudio."
    >
      <CompleteProfileForm />
    </AuthShell>
  );
}
