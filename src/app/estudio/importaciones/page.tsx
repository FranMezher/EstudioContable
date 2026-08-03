import { AlertTriangle, CheckCircle2, FileDown } from "lucide-react";
import { requireStudio } from "@/lib/session";
import { getImportRuns, getPendingReview } from "@/server/queries";
import { formatCuil, periodoLabel } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_LABEL: Record<string, string> = {
  DUPLICADO: "Ya estaba cargado",
  SIN_EMPLEADO: "Falta dar de alta al empleado",
  SIN_EMPRESA: "Falta dar de alta la empresa",
  SIN_PERIODO: "No se pudo leer el período",
  ERROR: "Error",
};

export default async function ImportacionesPage() {
  const { scope } = await requireStudio();
  const [runs, review] = await Promise.all([getImportRuns(), getPendingReview(scope)]);

  return (
    <>
      <PageHeader
        title="Importaciones"
        description="Corridas del importador de la carpeta mensual y lo que quedó sin asignar."
      />

      {review.pendingItems.length > 0 && (
        <Card className="mb-6 border-amber-200">
          <CardHeader className="border-amber-100">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Archivos sin asignar ({review.pendingItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-ink-600">
              El importador no los cargó porque no encontró la empresa o el empleado. Dalos de alta
              desde el panel y volvé a correr el importador, o cargá el recibo a mano.
            </p>
            <ul className="divide-y divide-ink-100">
              {review.pendingItems.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800">{i.fileName}</p>
                    <p className="truncate text-xs text-ink-500">
                      {i.message ?? STATUS_LABEL[i.status] ?? i.status}
                      {i.detectedLegajo ? ` · Legajo ${i.detectedLegajo}` : ""}
                      {i.detectedCuil ? ` · CUIL ${formatCuil(i.detectedCuil)}` : ""}
                      {i.periodYear ? ` · ${periodoLabel(i.periodMonth, i.periodYear)}` : ""}
                    </p>
                  </div>
                  <Badge tone={i.status === "DUPLICADO" ? "neutral" : "danger"}>
                    {STATUS_LABEL[i.status] ?? i.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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
