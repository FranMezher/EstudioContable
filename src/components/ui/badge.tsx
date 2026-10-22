import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "accent" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700 ring-ink-200",
  brand: "bg-brand-100 text-brand-700 ring-brand-200",
  accent: "bg-accent-100 text-accent-700 ring-accent-200",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  warning: "bg-accent-100 text-accent-700 ring-accent-200",
  danger: "bg-red-50 text-red-700 ring-red-100",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
