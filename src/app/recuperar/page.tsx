import Link from "next/link";
import { ArrowLeft, Building2, ShieldCheck, UserRound } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";

export default function RecuperarPage() {
  return (
    <AuthShell
      wide
      title="Recuperar contraseña"
      subtitle="Por seguridad, la contraseña la restablece un administrador y te entrega una nueva provisoria. Buscá tu caso:"
    >
      <div className="space-y-3">
        <Caso
          icon={UserRound}
          titulo="Sos empleado"
          texto="Pedile al estudio contable o al administrador de tu empresa que te la restablezca. Te va a dar una contraseña nueva y, al entrar, el sistema te pide elegir la tuya."
        />
        <Caso
          icon={Building2}
          titulo="Sos administrador de una empresa"
          texto="Te la restablece el estudio contable desde su panel (Configuración → Accesos). Te entrega una contraseña provisoria."
        />
        <Caso
          icon={ShieldCheck}
          titulo="Sos el estudio contable"
          texto="Como no hay un usuario por encima, tu clave se restablece desde el servidor volviendo a correr el seed con una contraseña nueva. Ver el instructivo del proyecto o pedí asistencia."
        />
      </div>

      <div className="mt-6 rounded-xl bg-brand-50 p-3.5 text-sm text-brand-800 ring-1 ring-brand-100">
        <b className="font-semibold">Tip:</b> si sos administrador y vas a crear un acceso nuevo,
        ahora podés elegir vos la contraseña en el mismo momento.
      </div>

      <Link
        href="/login"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-700"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a iniciar sesión
      </Link>
    </AuthShell>
  );
}

function Caso({
  icon: Icon,
  titulo,
  texto,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-ink-200 p-3.5 transition-colors hover:border-ink-300 hover:bg-ink-50/60">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink-800">{titulo}</p>
        <p className="text-sm text-ink-500">{texto}</p>
      </div>
    </div>
  );
}
