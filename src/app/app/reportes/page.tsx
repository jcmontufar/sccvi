import { requireApplicationUser } from "@/modules/auth/session";
import { getReport } from "@/modules/reports/services/report-service";
import { listActiveVaccinationScheduleDoses } from "@/modules/vaccination/services/vaccination-service";

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
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Reportes</h1>
        <p className="mt-2 text-muted-foreground">
          Información operacional autorizada para seguimiento, sin emitir
          diagnósticos.
        </p>
      </header>
      <form className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-4">
        <label className="text-sm font-medium">
          Reporte
          <select
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
            defaultValue={filters.type}
            name="type"
          >
            <option value="communities">Comunidades</option>
            <option value="growth">Crecimiento factual</option>
            <option value="vaccinations">Vacunas aplicadas</option>
            <option value="incomplete-vaccination">Dosis atrasadas</option>
            <option value="low-weight">Percentil de peso bajo</option>
            <option value="overweight">Percentil de peso alto</option>
            <option value="vaccination-coverage">
              Cobertura por dosis y comunidad
            </option>
            <option value="average-growth">
              Promedio de crecimiento por comunidad
            </option>
            <option value="alerts">Alertas</option>
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
        ) : null}
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
        <button
          className="h-10 rounded-lg bg-primary px-4 text-sm text-primary-foreground sm:w-fit"
          type="submit"
        >
          Generar reporte
        </button>
      </form>
      {"notice" in report ? (
        <p className="rounded-lg border bg-muted/40 p-4 text-sm">
          {report.notice}
        </p>
      ) : null}
      <div className="flex gap-3">
        <a
          className="rounded-lg border px-4 py-2 text-sm"
          href={`/api/v1/reports/pdf?${exportQuery}`}
        >
          Exportar PDF
        </a>
        <a
          className="rounded-lg border px-4 py-2 text-sm"
          href={`/api/v1/reports/excel?${exportQuery}`}
        >
          Exportar Excel
        </a>
      </div>
      <div className="overflow-x-auto rounded-xl border">
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
                className="border-t"
                key={`${row.fecha}-${row.registro}-${index}`}
              >
                <td className="p-3">{row.fecha}</td>
                <td className="p-3">{row.centro}</td>
                <td className="p-3">{row.comunidad}</td>
                <td className="p-3">{row.registro}</td>
                <td className="p-3">{row.detalle}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
