import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-500">{label}</p>
          <p className="tnum mt-1.5 text-[28px] font-bold leading-none tracking-tight text-ink-900">
            {value}
          </p>
          {hint && <p className="mt-2 truncate text-xs text-ink-500">{hint}</p>}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
