import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/constants";

/**
 * Marca del estudio: el logo MP sobre un chip blanco, para que contraste bien
 * tanto en la barra lateral azul como en el header claro.
 */
export function BrandMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-9 w-9 rounded-lg p-1",
    md: "h-10 w-10 rounded-xl p-1",
    lg: "h-16 w-16 rounded-2xl p-1.5",
  };
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center bg-white shadow-sm ring-1 ring-black/5",
        sizes[size],
        className
      )}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand-mark.png" alt="" className="h-full w-full object-contain" />
    </div>
  );
}

export function BrandLockup({
  subtitle = BRAND.tagline,
  tone = "light",
  className,
}: {
  subtitle?: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark size="sm" />
      <div className="min-w-0 leading-tight">
        <p className={cn("truncate text-sm font-semibold", tone === "dark" ? "text-ink-800" : "text-white")}>
          {BRAND.name}
        </p>
        <p className={cn("truncate text-[11px]", tone === "dark" ? "text-ink-500" : "text-brand-200")}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}
