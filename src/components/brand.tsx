import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/constants";

/**
 * Marca del estudio. El monograma MP es el ancla visual que se repite en el
 * login, la barra lateral y el favicon.
 */
export function BrandMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-9 w-9 text-[13px] rounded-lg",
    md: "h-10 w-10 text-sm rounded-xl",
    lg: "h-16 w-16 text-xl rounded-2xl",
  };
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center border border-white/25 bg-white/10 font-bold tracking-tight text-white",
        sizes[size],
        className
      )}
      aria-hidden
    >
      {BRAND.monogram}
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
      <BrandMark
        size="sm"
        className={tone === "dark" ? "border-brand-200 bg-brand-700 text-white" : undefined}
      />
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
