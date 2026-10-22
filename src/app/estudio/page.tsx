import Link from "next/link";
import { Search } from "lucide-react";
import { requireStudio } from "@/lib/session";
import { getNotifications } from "@/lib/notifications";
import { getDashboardStats, getPendingReview, getPeriodCoverage } from "@/server/queries";
import { MESES, periodoLabel } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { StatStrip } from "@/components/stat-strip";
import { NewCompanyForm } from "@/components/forms/new-company-form";

type Task = {
  count: number;
  title: string;
  detail: string;
  href: string;
  action: string;
  tone: "warning" | "info";
};

// Cómo se describe cada motivo del importador en una frase.
const MOTIVOS: Record<string, string> = {
  SIN_EMPRESA: "sin la empresa dada de alta",
  SIN_EMPLEADO: "sin el empleado dado de alta",
  SIN_PERIODO: "sin período legible",
  ERROR: "con error",
  DUPLICADO: "que ya estaban cargados",
};

function listar(partes: string[]) {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

export default async function EstudioHome() {
  const { user, scope } = await requireStudio();
  const [stats, review, notifications] = await Promise.all([
    getDashboardStats(scope),
    getPendingReview(scope),
    getNotifications(user.id),
  ]);

  const period =
    stats.lastPeriod?.periodYear && stats.lastPeriod?.periodMonth
      ? { periodYear: stats.lastPeriod.periodYear, periodMonth: stats.lastPeriod.periodMonth }
      : null;
  const coverage = period ? await getPeriodCoverage(scope, period) : [];
  const mes = period ? MESES[period.periodMonth - 1].toLowerCase() : null;

  const incompletas = coverage.filter((c) => c.activeEmployees > 0 && c.withPayslip < c.activeEmployees);
  const faltantes = incompletas.reduce((acc, c) => acc + (c.activeEmployees - c.withPayslip), 0);
  const conRecibo = coverage.reduce((acc, c) => acc + c.withPayslip, 0);
  const sinNinguno = incompletas.filter((c) => c.withPayslip === 0);

  // "Para hacer": solo lo que requiere una acción del estudio.
  const tasks: Task[] = [];
  if (review.total > 0) {
    const porMotivo = new Map<string, number>();
    for (const item of review.pendingItems) {
      porMotivo.set(item.status, (porMotivo.get(item.status) ?? 0) + 1);
    }
    const partes = [...porMotivo.entries()].map(
      ([status, n]) => `${n} ${MOTIVOS[status] ?? "con otro problema"}`
    );
    tasks.push({
      count: review.total,
      title: review.total === 1 ? "Recibo importado para revisar" : "Recibos importados para revisar",
      detail: `${listar(partes)}.`,
      href: "/estudio/importaciones",
      action: "Revisar",
      tone: "warning",
    });
  }
  if (mes && incompletas.length > 0) {
    tasks.push({
      count: incompletas.length,
      title:
        incompletas.length === 1 ? `Empresa con ${mes} incompleto` : `Empresas con ${mes} incompleto`,
      detail:
        sinNinguno.length > 0
          ? `${sinNinguno[0].name} todavía no tiene ningún recibo del mes.`
          : `Faltan ${faltantes} recibos en total.`,
      href: "/estudio/empresas",
      action: "Ver empresas",
      tone: "warning",
    });
  }
  if (mes && stats.periodUnsigned > 0) {
    tasks.push({
      count: stats.periodUnsigned,
      title: `Recibos de ${mes} sin firmar`,
      detail: "Cada empleado los firma desde su portal.",
      href: "/estudio/empresas",
      action: "Ver empresas",
      tone: "info",
    });
  }

  const description = !period
    ? "Todavía no hay recibos cargados."
    : faltantes > 0
      ? `Faltan cargar ${faltantes} recibos en ${incompletas.length} ${incompletas.length === 1 ? "empresa" : "empresas"}.`
      : "Todas las empresas tienen sus recibos del mes.";

  return (
    <>
      <PageHeader
        title={period ? periodoLabel(period.periodMonth, period.periodYear) : "Inicio"}
        description={description}
        action={<NewCompanyForm />}
      />

      <form action="/estudio/empresas" role="search" className="mb-8">
        <label className="flex h-[60px] items-center gap-3.5 rounded-lg border-2 border-brand-700 bg-white px-5 text-ink-500">
          <Search className="h-5 w-5 shrink-0" aria-hidden />
          <span className="sr-only">Buscar empresa</span>
          <input
            name="q"
            type="search"
            placeholder="Buscá una empresa por nombre o CUIT"
            className="min-w-0 flex-1 bg-transparent text-[17px] text-ink-900 outline-none placeholder:text-ink-500"
          />
        </label>
      </form>

      <StatStrip
        className="mb-10"
        stats={[
          { label: "Empresas", value: stats.companies },
          { label: "Empleados activos", value: stats.employees },
          {
            label: mes ? `Recibos de ${mes}` : "Recibos",
            value: mes ? conRecibo : stats.payslips,
            suffix: mes ? `de ${stats.employees}` : undefined,
          },
          { label: "Firmados", value: stats.periodPayslips - stats.periodUnsigned },
        ]}
      />

      <div className="flex flex-wrap items-start gap-8">
        <section className="min-w-0 flex-[2_1_520px]">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl font-semibold text-ink-900">Para hacer</h2>
            {tasks.length > 0 && (
              <p className="text-sm text-ink-500">
                {tasks.length} {tasks.length === 1 ? "pendiente" : "pendientes"}
              </p>
            )}
          </div>

          {tasks.length === 0 ? (
            <p className="rounded-lg border border-ink-200 bg-white px-5 py-6 text-sm text-ink-600">
              No hay nada pendiente. Las importaciones están revisadas y los recibos del mes, cargados.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {tasks.map((t) => (
                <li
                  key={t.title}
                  className="flex flex-wrap items-center gap-4 rounded-lg border border-ink-200 bg-white px-5 py-4"
                >
                  <div
                    className={
                      "tnum flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-md font-serif text-[22px] font-semibold " +
                      (t.tone === "warning" ? "bg-accent-100 text-accent-700" : "bg-brand-100 text-brand-700")
                    }
                  >
                    {t.count}
                  </div>
                  <div className="min-w-0 flex-[1_1_240px]">
                    <p className="font-semibold text-ink-900">{t.title}</p>
                    <p className="mt-0.5 text-sm text-ink-500">{t.detail}</p>
                  </div>
                  <Link
                    href={t.href}
                    className="flex h-11 items-center rounded-md bg-brand-700 px-[18px] text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                  >
                    {t.action}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0 flex-[1_1_280px]">
          <h2 className="mb-3.5 font-serif text-2xl font-semibold text-ink-900">Actividad reciente</h2>
          {notifications.length === 0 ? (
            <p className="text-sm text-ink-500">Todavía no hay movimientos.</p>
          ) : (
            <ol className="flex flex-col gap-5 border-l-2 border-ink-200 pl-[18px] pt-1">
              {notifications.slice(0, 6).map((n) => (
                <li key={n.id} className="relative">
                  <span
                    aria-hidden
                    className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-700 ring-[3px] ring-ink-50"
                  />
                  <p className="text-sm font-semibold text-ink-900">{n.title}</p>
                  <p className="text-sm text-ink-600">{n.message}</p>
                  <p className="mt-0.5 text-[13px] text-ink-500">{formatDateTime(n.createdAt)}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
