import Link from "next/link";
import { ArrowLeft, Building2, ShieldCheck, UserRound } from "lucide-react";
import { BRAND } from "@/lib/constants";
import { BrandMark } from "@/components/brand";

export default function RecuperarPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 to-brand-600 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark size="lg" className="mb-3" />
          <h1 className="text-2xl font-bold text-white">{BRAND.name}</h1>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <h2 className="mb-1 text-lg font-semibold text-slate-800">Recuperar contraseña</h2>
          <p className="mb-5 text-sm text-slate-500">
            Por seguridad, la contraseña la restablece un administrador y te entrega una nueva
            provisoria. Buscá tu caso:
          </p>

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

          <div className="mt-6 rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
            Tip: si sos administrador y vas a crear un acceso nuevo, ahora podés elegir vos la
            contraseña en el mismo momento.
          </div>

          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" /> Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
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
    <div className="flex gap-3 rounded-lg border border-slate-200 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">{titulo}</p>
        <p className="text-sm text-slate-500">{texto}</p>
      </div>
    </div>
  );
}
