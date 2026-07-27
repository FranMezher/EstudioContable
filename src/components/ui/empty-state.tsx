import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-ink-50/60 px-6 py-14 text-center">
      <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-ink-400 shadow-xs ring-1 ring-ink-200">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
    </div>
  );
}
