import { CheckCircle2, FileDown } from "lucide-react";
import { requireStudio } from "@/lib/session";
import { getImportRuns, getPendingReview } from "@/server/queries";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { PendingReview } from "@/components/pending-review";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ImportacionesPage() {
  const { scope } = await requireStudio();
  const [runs, review] = await Promise.all([getImportRuns(), getPendingReview(scope)]);

  return (
    <>
      <PageHeader
        title="Importaciones"
        description="Corridas del importador de la carpeta mensual y lo que quedó sin asignar."
      />

      <PendingReview items={review.pendingItems} />

      <Card>
        <CardHeader>
          <CardTitle>Últimas corridas</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <EmptyState
              title="Todavía no se corrió el importador"
              description="Mirá docs/IMPORTADOR.md para configurarlo en la PC del estudio."
              icon={FileDown}
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {runs.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800">{r.sourceLabel}</p>
                    <p className="truncate text-xs text-ink-500">
                      {formatDateTime(r.startedAt)} · {r.company} · {r.totalFiles} archivo(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.isDryRun && <Badge tone="neutral">Simulación</Badge>}
                    <Badge tone="success">
                      <CheckCircle2 className="h-3 w-3" /> {r.createdCount} cargados
                    </Badge>
                    {r.skippedCount > 0 && <Badge tone="neutral">{r.skippedCount} repetidos</Badge>}
                    {r.errorCount > 0 && <Badge tone="danger">{r.errorCount} con problema</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
