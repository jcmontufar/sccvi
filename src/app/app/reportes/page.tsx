import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireApplicationUser } from "@/modules/auth/session";
import { ReportAnalytics } from "@/modules/reports/components/report-analytics";
import { getReport } from "@/modules/reports/services/report-service";
import { listActiveVaccinationScheduleDoses } from "@/modules/vaccination/services/vaccination-service";

const reportNames: Record<string, string> = {
  communities: "Comunidades",
  growth: "Crecimiento factual",
  vaccinations: "Vacunas aplicadas",
  "incomplete-vaccination": "Dosis atrasadas",
  "low-weight": "Percentil de peso bajo",
  overweight: "Percentil de peso alto",
  "vaccination-coverage": "Cobertura por dosis y comunidad",
  "average-growth": "Promedio de crecimiento por comunidad",
  alerts: "Alertas",
};

function reportPeriod(from: string, to: string, usesPeriod: boolean) {
  if (!usesPeriod) return "Evaluación vigente";
  if (from && to) return `Del ${from} al ${to}`;
  if (from) return `Desde ${from}`;
  if (to) return `Hasta ${to}`;
  return "Sin límite de período";
}

function reportLimit(type: string) {
  if (["growth", "vaccinations", "alerts"].includes(type)) {
    return "Límite del resultado: 1,000 registros";
  }
  if (["low-weight", "overweight", "average-growth"].includes(type)) {
    return "Límite del resultado: 5,000 mediciones evaluadas";
  }
  return "Indicadores derivados del resultado generado";
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    from?: string;
    to?: string;
    doseCode?: string;
  }>;
}) {
  const query = await searchParams;
  const filters = {
    type: query.type ?? "communities",
    from: query.from ?? "",
    to: query.to ?? "",
    doseCode: query.doseCode ?? "",
  };
  const user = await requireApplicationUser();
  const isCoverageReport = filters.type === "vaccination-coverage";
  const schedule = isCoverageReport
    ? await listActiveVaccinationScheduleDoses(user)
    : null;
  const report = await getReport(user, filters);
  const exportQuery = new URLSearchParams(filters).toString();
  const hasFilters = Boolean(
    filters.from ||
    filters.to ||
    filters.doseCode ||
    filters.type !== "communities",
  );

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm font-medium text-sky-700">Análisis operativo</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Centro de reportes
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Consulta información autorizada para seguimiento territorial, de
          crecimiento, vacunación y alertas, sin emitir diagnósticos.
        </p>
      </header>

      <form className="rounded-2xl border bg-card p-4 shadow-sm">
        <div
          className={`grid gap-3 ${isCoverageReport ? "md:grid-cols-2" : "md:grid-cols-3"}`}
        >
          <label className="text-sm font-medium">
            Reporte
            <select
              className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
              defaultValue={filters.type}
              name="type"
            >
              <optgroup label="Territorio">
                <option value="communities">Comunidades</option>
              </optgroup>
              <optgroup label="Crecimiento">
                <option value="growth">Crecimiento factual</option>
                <option value="low-weight">Percentil de peso bajo</option>
                <option value="overweight">Percentil de peso alto</option>
                <option value="average-growth">
                  Promedio de crecimiento por comunidad
                </option>
              </optgroup>
              <optgroup label="Vacunación">
                <option value="vaccinations">Vacunas aplicadas</option>
                <option value="incomplete-vaccination">Dosis atrasadas</option>
                <option value="vaccination-coverage">
                  Cobertura por dosis y comunidad
                </option>
              </optgroup>
              <optgroup label="Seguimiento operativo">
                <option value="alerts">Alertas</option>
              </optgroup>
            </select>
          </label>
          {schedule ? (
            <label className="text-sm font-medium">
              Dosis del esquema vigente
              <select
                className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
                defaultValue={filters.doseCode}
                name="doseCode"
              >
                <option value="">Selecciona una dosis</option>
                {schedule.doses.map((dose) => (
                  <option key={dose.doseCode} value={dose.doseCode}>
                    {dose.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label className="text-sm font-medium">
                Desde
                <input
                  className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
                  defaultValue={filters.from}
                  name="from"
                  type="date"
                />
              </label>
              <label className="text-sm font-medium">
                Hasta
                <input
                  className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
                  defaultValue={filters.to}
                  name="to"
                  type="date"
                />
              </label>
            </>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit">Generar reporte</Button>
          {hasFilters ? (
            <Button
              render={<Link href="/app/reportes" />}
              type="button"
              variant="ghost"
            >
              Limpiar filtros
            </Button>
          ) : null}
        </div>
      </form>

      <header className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border bg-muted/30 p-5">
        <div>
          <p className="text-sm text-muted-foreground">
            {reportNames[filters.type] ?? "Reporte operacional"}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            {report.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {reportPeriod(filters.from, filters.to, !isCoverageReport)} ·{" "}
            {reportLimit(filters.type)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            render={<a href={`/api/v1/reports/pdf?${exportQuery}`} />}
            variant="outline"
          >
            Exportar PDF
          </Button>
          <Button
            render={<a href={`/api/v1/reports/excel?${exportQuery}`} />}
            variant="outline"
          >
            Exportar Excel
          </Button>
        </div>
      </header>

      {report.notice ? (
        <p className="rounded-xl border bg-amber-50 p-4 text-sm text-amber-900">
          {report.notice}
        </p>
      ) : null}

      <ReportAnalytics analytics={report.analytics} />

      {report.rows.length ? (
        <section aria-labelledby="report-table-title" className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold" id="report-table-title">
              Detalle del resultado
            </h2>
            <p className="text-sm text-muted-foreground">
              Tabla completa del resultado generado ({report.rows.length}{" "}
              {report.rows.length === 1 ? "registro" : "registros"}).
            </p>
          </div>
          <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
            <table className="w-full min-w-3xl text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left">Fecha</th>
                  <th className="p-3 text-left">Centro</th>
                  <th className="p-3 text-left">Comunidad</th>
                  <th className="p-3 text-left">Registro</th>
                  <th className="p-3 text-left">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row, index) => (
                  <tr
                    className="border-t align-top hover:bg-muted/30"
                    key={`${row.fecha}-${row.registro}-${index}`}
                  >
                    <td className="p-3 whitespace-nowrap">{row.fecha}</td>
                    <td className="p-3">{row.centro}</td>
                    <td className="p-3">{row.comunidad}</td>
                    <td className="p-3 font-medium">{row.registro}</td>
                    <td className="p-3">{row.detalle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed bg-muted/30 p-8 text-center">
          <h2 className="font-medium">{report.analytics.emptyTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.analytics.emptyDescription}
          </p>
        </section>
      )}
    </section>
  );
}
