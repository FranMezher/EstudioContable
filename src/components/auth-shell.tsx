import { BRAND } from "@/lib/constants";
import { BrandMark } from "@/components/brand";

/**
 * Marco compartido de las pantallas de acceso (login, cambio de clave, perfil,
 * recuperación): la marca y el formulario, sin nada más alrededor.
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
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-12">
      <div className={`w-full ${wide ? "max-w-lg" : "max-w-[420px]"}`}>
        <div className="mb-7 flex items-center justify-center gap-3">
          <BrandMark size="md" />
          <p className="font-serif text-[22px] font-semibold text-brand-700">{BRAND.name}</p>
        </div>

        <div className="rounded-lg border border-ink-200 bg-white p-6 sm:p-8">
          <h1 className="font-serif text-[28px] font-semibold leading-tight text-brand-700">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
