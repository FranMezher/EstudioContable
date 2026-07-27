import { BRAND } from "@/lib/constants";
import { BrandMark } from "@/components/brand";

/**
 * Marco compartido de las pantallas de acceso (login, cambio de clave, perfil,
 * recuperación). Da una primera impresión cuidada y consistente.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-800 via-brand-800 to-brand-900 px-4 py-12">
      {/* Atmósfera: dos veladuras cálidas/frías muy suaves */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px 340px at 85% 8%, rgba(196,118,42,.22), transparent 60%)," +
            "radial-gradient(560px 320px at 12% 92%, rgba(132,172,217,.18), transparent 60%)",
        }}
      />
      {/* Retícula tenue */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className={`relative w-full ${wide ? "max-w-lg" : "max-w-md"}`}>
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark size="lg" className="mb-3.5" />
          <h1 className="text-2xl font-bold tracking-tight text-white">{BRAND.name}</h1>
          <p className="mt-1 text-sm tracking-wide text-brand-100">{BRAND.tagline}</p>
        </div>

        <div className="rounded-2xl border border-white/60 bg-white p-6 shadow-2xl shadow-brand-900/30 sm:p-8">
          <h2 className="mb-1 text-lg font-semibold tracking-tight text-ink-900">{title}</h2>
          {subtitle && <p className="mb-6 text-sm text-ink-500">{subtitle}</p>}
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-brand-100/80">
          © {new Date().getFullYear()} Estudio {BRAND.name}
        </p>
      </div>
    </div>
  );
}
