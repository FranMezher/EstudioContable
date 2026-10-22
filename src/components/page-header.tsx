export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-serif text-3xl font-semibold leading-tight text-brand-700 sm:text-[40px]">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-base text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
