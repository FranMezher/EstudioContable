import { cn } from "@/lib/utils";

export type Stat = {
  label: string;
  value: React.ReactNode;
  /** Texto chico al lado del valor, por ejemplo "de 312". */
  suffix?: string;
  hint?: string;
  tone?: "default" | "warning";
};

/**
 * Métricas en una sola franja dividida, en lugar de tarjetas sueltas.
 * En celular quedan de a dos por fila.
 */
export function StatStrip({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <section
      aria-label="Resumen"
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-lg border border-ink-200 bg-white",
        stats.length >= 4 ? "lg:grid-cols-4" : stats.length === 3 ? "lg:grid-cols-3" : "",
        className
      )}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          className={cn(
            "border-ink-100 px-6 py-5 [&:not(:last-child)]:border-r",
            s.tone === "warning" && "bg-accent-50"
          )}
        >
          <p className={cn("text-[13px]", s.tone === "warning" ? "text-accent-700" : "text-ink-500")}>
            {s.label}
          </p>
          <p
            className={cn(
              "tnum mt-1.5 font-serif text-[32px] font-semibold leading-none",
              s.tone === "warning" ? "text-accent-700" : "text-ink-900"
            )}
          >
            {s.value}
            {s.suffix && (
              <span className="ml-1.5 font-sans text-base font-medium text-ink-500">{s.suffix}</span>
            )}
          </p>
          {s.hint && <p className="mt-2 truncate text-xs text-ink-500">{s.hint}</p>}
        </div>
      ))}
    </section>
  );
}
