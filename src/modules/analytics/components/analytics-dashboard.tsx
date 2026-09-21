"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard } from "@/components/charts/chart-card";
import {
  chartPalette,
  semanticChartColors,
} from "@/components/charts/chart-palette";
import { Button } from "@/components/ui/button";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { EmptyState } from "@/components/ui/empty-state";
import type { AnalyticsResult } from "@/modules/analytics/types/analytics";
import type { ApplicationRole } from "@/modules/auth/types";

const sortLabels = {
  children: "Niños activos",
  measurements: "Mediciones",
  overdueFollowUps: "Seguimientos vencidos",
  overdueDoses: "Dosis atrasadas",
  openAlerts: "Alertas abiertas",
  criticalAlerts: "Alertas críticas",
  lowPercentile: "Evaluaciones P<5",
  highPercentile: "Evaluaciones P>95",
} as const;

const alertTypeLabels = {
  ALL: "Todos los tipos",
  GROWTH: "Crecimiento",
  VACCINATION: "Vacunación",
  MISSED_FOLLOW_UP: "Seguimiento vencido",
} as const;

function PriorityList({
  title,
  items,
}: {
  title: string;
  items: AnalyticsResult["priorities"]["alerts"];
}) {
  return (
    <article className="rounded-2xl border bg-card p-5 shadow-sm">
      <h3 className="font-semibold">{title}</h3>
      <p className="mb-3 text-sm text-muted-foreground">
        Ordenado por mayor antigüedad operativa.
      </p>
      {items.length ? (
        <ul className="divide-y">
          {items.map((item) => (
            <li className="py-3 first:pt-0" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    className="font-medium hover:underline"
                    href={`/app/ninos/${item.childId}`}
                  >
                    {item.childName}
                  </Link>
                  <p className="truncate text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.community} · desde {item.date}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-warning/10 px-2 py-1 text-xs font-semibold text-warning">
                  {item.daysPending} días pendientes
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState>No hay elementos en esta prioridad.</EmptyState>
      )}
    </article>
  );
}

export function AnalyticsDashboard({
  result,
  role,
}: {
  result: AnalyticsResult;
  role: ApplicationRole;
}) {
  const { filters } = result;
  const cards = [
    ["Niños activos", result.summary.activeChildren],
    ["Mediciones del período", result.summary.measurements],
    ["Seguimientos vencidos", result.summary.overdueFollowUps],
    ["Dosis atrasadas", result.summary.overdueDoses],
    ["Alertas abiertas", result.summary.openAlerts],
    ["Alertas críticas", result.summary.criticalAlerts],
  ] as const;
  const hasTrend = result.trends.some(
    (item) =>
      item.measurements ||
      item.vaccinations ||
      item.alertsGenerated ||
      item.followUpsDue,
  );

  return (
    <div className="space-y-7">
      <form className="rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="font-semibold">Filtros globales</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Los indicadores se recalculan únicamente con la población autorizada.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-medium">
            Desde
            <input
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3"
              defaultValue={filters.from}
              name="from"
              type="date"
            />
          </label>
          <label className="text-sm font-medium">
            Hasta
            <input
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3"
              defaultValue={filters.to}
              name="to"
              type="date"
            />
          </label>
          <label className="text-sm font-medium">
            Fecha de corte
            <input
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3"
              defaultValue={filters.cutoffDate}
              name="cutoffDate"
              type="date"
            />
          </label>
          {role === "ADMIN" ? (
            <label className="text-sm font-medium">
              Centro de salud
              <select
                className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3"
                defaultValue={filters.healthCenterId}
                name="healthCenterId"
              >
                <option value="">Todos los centros</option>
                {result.options.healthCenters.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="text-sm font-medium">
            Comunidad
            <select
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3"
              defaultValue={filters.communityId}
              name="communityId"
            >
              <option value="">Todas las comunidades</option>
              {result.options.communities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Edad mínima (meses)
            <input
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3"
              defaultValue={filters.minAgeMonths}
              max="59"
              min="0"
              name="minAgeMonths"
              type="number"
            />
          </label>
          <label className="text-sm font-medium">
            Edad máxima (meses)
            <input
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3"
              defaultValue={filters.maxAgeMonths}
              max="59"
              min="0"
              name="maxAgeMonths"
              type="number"
            />
          </label>
          <label className="text-sm font-medium">
            Sexo
            <select
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3"
              defaultValue={filters.sex}
              name="sex"
            >
              <option value="ALL">Todos</option>
              <option value="FEMALE">Femenino</option>
              <option value="MALE">Masculino</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Dosis para cobertura
            <select
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3"
              defaultValue={filters.doseCode}
              name="doseCode"
            >
              <option value="">Selecciona una dosis</option>
              {result.options.doses.map((item) => (
                <option key={item.doseCode} value={item.doseCode}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Tipo de alerta
            <select
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3"
              defaultValue={filters.alertType}
              name="alertType"
            >
              {Object.entries(alertTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Severidad de alerta
            <select
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3"
              defaultValue={filters.alertSeverity}
              name="alertSeverity"
            >
              <option value="ALL">Todas</option>
              <option value="PREVENTIVE">Preventiva</option>
              <option value="CRITICAL">Crítica</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Estado de alerta
            <select
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3"
              defaultValue={filters.alertStatus}
              name="alertStatus"
            >
              <option value="ALL">Todos</option>
              <option value="OPEN">Abierta</option>
              <option value="REVIEWED">Revisada</option>
              <option value="RESOLVED">Resuelta</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Orden territorial
            <select
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3"
              defaultValue={filters.sortBy}
              name="sortBy"
            >
              {Object.entries(sortLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit">Actualizar análisis</Button>
          <Button
            render={<Link href="/app/analitica" />}
            type="button"
            variant="ghost"
          >
            Limpiar filtros
          </Button>
        </div>
      </form>

      <section
        aria-label="Resumen ejecutivo"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        {cards.map(([label, value]) => (
          <article
            className="rounded-2xl border bg-card p-4 shadow-sm"
            key={label}
          >
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {value}
            </p>
          </article>
        ))}
      </section>

      <section className="space-y-4" aria-labelledby="trends-title">
        <div>
          <h2 className="text-xl font-semibold" id="trends-title">
            Tendencias operativas
          </h2>
          <p className="text-sm text-muted-foreground">
            Actividad factual del período seleccionado.
          </p>
        </div>
        {hasTrend ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard
              title="Controles y vacunación"
              description="Registros realizados, sin inferir resultados clínicos."
            >
              <div
                className="h-72"
                role="img"
                aria-label="Tendencia de mediciones, niños medidos y vacunas aplicadas"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.trends} accessibilityLayer>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line
                      dataKey="measurements"
                      name="Mediciones"
                      stroke={chartPalette[0]}
                    />
                    <Line
                      dataKey="measuredChildren"
                      name="Niños medidos"
                      stroke={chartPalette[2]}
                    />
                    <Line
                      dataKey="vaccinations"
                      name="Vacunas aplicadas"
                      stroke={chartPalette[3]}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <ChartCard
              title="Alertas y seguimientos"
              description="Eventos generados, resueltos, previstos y completados."
            >
              <div
                className="h-72"
                role="img"
                aria-label="Tendencia de alertas y seguimientos"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.trends} accessibilityLayer>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line
                      dataKey="alertsGenerated"
                      name="Alertas generadas"
                      stroke={semanticChartColors.critical}
                    />
                    <Line
                      dataKey="alertsResolved"
                      name="Alertas resueltas"
                      stroke={semanticChartColors.applied}
                    />
                    <Line
                      dataKey="followUpsDue"
                      name="Seguimientos previstos"
                      stroke={semanticChartColors.pending}
                    />
                    <Line
                      dataKey="followUpsCompleted"
                      name="Seguimientos completados"
                      stroke={chartPalette[1]}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        ) : (
          <EmptyState>No hay actividad en el período seleccionado.</EmptyState>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="territory-title">
        <div>
          <h2 className="text-xl font-semibold" id="territory-title">
            Análisis territorial
          </h2>
          <p className="text-sm text-muted-foreground">
            Conteos operativos por comunidad; no constituyen un puntaje de
            riesgo.
          </p>
        </div>
        {result.territories.length ? (
          <DataTableShell>
            <table className="w-full min-w-6xl text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left">Comunidad</th>
                  {Object.values(sortLabels).map((label) => (
                    <th className="p-3 text-right" key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.territories.map((row) => (
                  <tr className="border-t" key={row.communityId}>
                    <td className="p-3">
                      <span className="font-medium">{row.community}</span>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {row.healthCenter}
                      </span>
                    </td>
                    {Object.keys(sortLabels).map((key) => (
                      <td className="p-3 text-right tabular-nums" key={key}>
                        {row[key as keyof typeof sortLabels]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTableShell>
        ) : (
          <EmptyState>
            No hay comunidades autorizadas para los filtros seleccionados.
          </EmptyState>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Cobertura por dosis y comunidad"
          description={`Esquema ${result.vaccination.versionCode}. La cobertura solo se calcula para la dosis seleccionada.`}
        >
          {!filters.doseCode ? (
            <EmptyState>
              Selecciona una dosis para calcular aplicadas, elegibles y
              porcentaje.
            </EmptyState>
          ) : result.vaccination.coverage.length ? (
            <div className="space-y-2">
              {result.vaccination.coverage.map((row) => (
                <div
                  className="flex items-center justify-between rounded-xl bg-muted/40 p-3 text-sm"
                  key={row.communityId}
                >
                  <span>{row.community}</span>
                  <span className="font-medium tabular-nums">
                    {row.applied}/{row.eligible} ·{" "}
                    {row.percentage === null ? "N/A" : `${row.percentage} %`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>
              No hay comunidades para la dosis seleccionada.
            </EmptyState>
          )}
        </ChartCard>
        <ChartCard
          title="Dosis atrasadas por comunidad"
          description="Conteos derivados del evaluador MSPAS central a la fecha de corte."
        >
          {result.vaccination.overdueByCommunity.some((item) => item.value) ? (
            <div
              className="h-72"
              role="img"
              aria-label="Dosis atrasadas por comunidad"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={result.vaccination.overdueByCommunity}
                  accessibilityLayer
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="value"
                    name="Dosis atrasadas"
                    fill={semanticChartColors.overdue}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState>
              No hay dosis atrasadas en la población filtrada.
            </EmptyState>
          )}
        </ChartCard>
      </section>

      <section
        className="rounded-2xl border bg-card p-5 shadow-sm"
        aria-labelledby="growth-title"
      >
        <h2 className="font-semibold" id="growth-title">
          Crecimiento: evaluaciones de peso para la edad
        </h2>
        <p className="text-sm text-muted-foreground">
          Se muestran por separado evaluaciones y niños únicos del resultado.
          P&lt;5 y P&gt;95 son señales preventivas, no diagnósticos.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Evaluaciones P<5", result.growth.lowEvaluations],
            ["Niños únicos P<5", result.growth.lowChildren],
            ["Evaluaciones P>95", result.growth.highEvaluations],
            ["Niños únicos P>95", result.growth.highChildren],
          ].map(([label, value]) => (
            <div className="rounded-xl bg-muted/50 p-4" key={label}>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="priorities-title">
        <div>
          <h2 className="text-xl font-semibold" id="priorities-title">
            Prioridades operativas
          </h2>
          <p className="text-sm text-muted-foreground">
            Antigüedad para organizar seguimiento; no representa severidad
            médica.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <PriorityList
            title="Seguimientos vencidos"
            items={result.priorities.followUps}
          />
          <PriorityList
            title="Dosis atrasadas"
            items={result.priorities.vaccinations}
          />
          <PriorityList
            title="Alertas abiertas"
            items={result.priorities.alerts}
          />
        </div>
      </section>

      <aside className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Notas metodológicas.</strong> Los
        indicadores usan datos factual u operativos autorizados. Las dosis se
        evalúan con {result.vaccination.versionCode}, respetando aplicabilidad
        de cohorte e historia registrada. La cobertura es únicamente por dosis y
        comunidad; N/A significa que no hay niños elegibles. No se calculan
        diagnósticos, puntajes compuestos ni cobertura histórica.
      </aside>
    </div>
  );
}
