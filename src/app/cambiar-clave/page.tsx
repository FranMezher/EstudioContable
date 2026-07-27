import { AuthShell } from "@/components/auth-shell";
import { requireUser } from "@/lib/session";
import { ChangePasswordForm } from "./change-password-form";

export default async function CambiarClavePage() {
  const user = await requireUser();

  return (
    <AuthShell
      title={user.mustChangePassword ? "Elegí tu contraseña" : "Cambiar contraseña"}
      subtitle={
        user.mustChangePassword
          ? "Por seguridad, cambiá la contraseña provisoria antes de continuar."
          : "Ingresá tu contraseña actual y la nueva."
      }
    >
      <ChangePasswordForm />
    </AuthShell>
  );
}
