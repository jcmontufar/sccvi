"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  chartPalette,
  semanticChartColors,
} from "@/components/charts/chart-palette";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { ApplicationRole } from "@/modules/auth/types";
import type { DashboardMetrics } from "@/modules/dashboard/services/dashboard-service";

const vaccinationLabels = {
  APPLIED: "Aplicadas",
  PENDING: "Pendientes",
  OVERDUE: "Atrasadas",
} as const;

const alertTypeLabels = {
  GROWTH: "Crecimiento",
  VACCINATION: "Vacunación",
  MISSED_FOLLOW_UP: "Seguimiento vencido",
} as const;

const alertSeverityLabels = {
  PREVENTIVE: "Preventiva",
  CRITICAL: "Crítica",
} as const;

const vaccinationChartColors = [
  semanticChartColors.applied,
  semanticChartColors.pending,
  semanticChartColors.overdue,
];

function DashboardIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    children: (
      <path d="M9 12a4 4 0 1 0 6 0M12 2v3m-5-1 2 2m8-2-2 2M5 21a7 7 0 0 1 14 0" />
    ),
    communities: <path d="M3 21v-8l5-3 5 3v8m0-6 4-2 4 3v5M7 16h2m7 1h2" />,
    guardians: (
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8m13 18v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    ),
    growth: <path d="M4 19V9m6 10V5m6 14v-7m5 7H2" />,
    alerts: (
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 13h4" />
    ),
    pending: <path d="M12 6v6l4 2m5-2a9 9 0 1 1-9-9" />,
    overdue: (
      <path d="M12 9v4m0 4h.01M10.3 3.7 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0" />
    ),
  };
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    payload?: { name?: string };
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-lg">
      <p className="font-medium">{label ?? item?.payload?.name}</p>
      <p className="text-muted-foreground">{item?.value ?? 0} registros</p>
    </div>
  );
}

export function DashboardOverview({
  metrics,
  role,
}: {
  metrics: DashboardMetrics;
  role: ApplicationRole;
}) {
  const cards = [
    {
      label: "Niños activos",
      value: metrics.children,
      icon: "children",
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Comunidades activas",
      value: metrics.communities,
      icon: "communities",
      tone: "bg-success/10 text-success",
      hideForGuardian: true,
    },
    {
      label: "Tutores activos",
      value: metrics.guardians,
      icon: "guardians",
      tone: "bg-chart-4/10 text-chart-4",
      hideForGuardian: true,
    },
    {
      label: "Mediciones registradas",
      value: metrics.growthRecords,
      icon: "growth",
      tone: "bg-secondary/15 text-primary",
    },
    {
      label: "Alertas abiertas",
      value: metrics.openAlerts,
      icon: "alerts",
      tone: "bg-destructive/10 text-destructive",
    },
    {
      label: "Dosis pendientes",
      value: metrics.pendingVaccinations,
      icon: "pending",
      tone: "bg-warning/10 text-warning",
    },
    {
      label: "Dosis atrasadas",
      value: metrics.overdueVaccinations,
      icon: "overdue",
      tone: "bg-destructive/10 text-destructive",
    },
  ].filter((card) => role !== "GUARDIAN" || !card.hideForGuardian);

  const vaccinationData = metrics.vaccinationStatus
    .filter((item) => item.count > 0)
    .map((item) => ({
      name: vaccinationLabels[item.status],
      value: item.count,
    }));
  const alertData = metrics.alertDistribution.map((item) => ({
    name: `${alertTypeLabels[item.type]} · ${alertSeverityLabels[item.severity]}`,
    value: item.count,
  }));
  const quickActions =
    role === "GUARDIAN"
      ? [{ label: "Ver niños asociados", href: "/app/ninos" }]
      : [
          ...(role === "ADMIN" || role === "HEALTH_STAFF"
            ? [{ label: "Registrar niño", href: "/app/ninos/nuevo" }]
            : []),
          { label: "Revisar alertas", href: "/app/alertas" },
          { label: "Consultar reportes", href: "/app/reportes" },
          { label: "Ver comunidades", href: "/app/comunidades" },
        ];

  return (
    <div className="space-y-6">
      <section
        aria-label="Resumen operativo"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {cards.map((card) => (
          <article
            className="rounded-2xl border bg-card p-4 shadow-sm"
            key={card.label}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">
                  {card.value}
                </p>
              </div>
              <span className={`rounded-xl p-2.5 ${card.tone}`}>
                <DashboardIcon name={card.icon} />
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold">Estado de vacunación</h2>
            <p className="text-sm text-muted-foreground">
              Dosis evaluadas según el esquema vigente.
            </p>
          </div>
          {vaccinationData.length ? (
            <div
              className="h-64"
              role="img"
              aria-label="Gráfica del estado de vacunación"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart accessibilityLayer>
                  <Pie
                    data={vaccinationData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={54}
                    outerRadius={84}
                    paddingAngle={3}
                  >
                    {vaccinationData.map((item, index) => (
                      <Cell
                        key={item.name}
                        fill={
                          vaccinationChartColors[
                            index % vaccinationChartColors.length
                          ]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="-mt-4 flex flex-wrap justify-center gap-3 text-xs">
                {vaccinationData.map((item, index) => (
                  <span className="flex items-center gap-1.5" key={item.name}>
                    <span
                      className="size-2 rounded-full"
                      style={{
                        backgroundColor:
                          vaccinationChartColors[
                            index % vaccinationChartColors.length
                          ],
                      }}
                    />
                    {item.name}: {item.value}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState>No hay dosis aplicables para mostrar.</EmptyState>
          )}
        </article>

        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold">Alertas abiertas</h2>
            <p className="text-sm text-muted-foreground">
              Distribución por tipo y severidad.
            </p>
          </div>
          {alertData.length ? (
            <div
              className="h-64"
              role="img"
              aria-label="Gráfica de alertas abiertas"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={alertData}
                  layout="vertical"
                  margin={{ left: 8, right: 16 }}
                  accessibilityLayer
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="value"
                    name="Alertas"
                    fill={semanticChartColors.critical}
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState>No hay alertas abiertas.</EmptyState>
          )}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Requieren atención</h2>
              <p className="text-sm text-muted-foreground">
                Seguimientos operativos disponibles para revisión.
              </p>
            </div>
            {role !== "GUARDIAN" && (
              <Button render={<Link href="/app/alertas" />} variant="outline">
                Ver alertas
              </Button>
            )}
          </div>
          {metrics.requiresAttention.length ? (
            <ul className="divide-y">
              {metrics.requiresAttention.map((item) => (
                <li
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  key={item.id}
                >
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${item.kind === "ALERT" ? "bg-destructive" : "bg-warning"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.childName}
                    </p>
                  </div>
                  <Button
                    render={<Link href={item.href} />}
                    size="sm"
                    variant="ghost"
                  >
                    Revisar
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>
              No hay seguimientos que requieran atención inmediata.
            </EmptyState>
          )}
        </article>

        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold">Niños por comunidad</h2>
            <p className="text-sm text-muted-foreground">
              Distribución de niños activos autorizados.
            </p>
          </div>
          {metrics.communityDistribution.some((item) => item.children > 0) ? (
            <div
              className="h-72"
              role="img"
              aria-label="Gráfica de niños por comunidad"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics.communityDistribution}
                  margin={{ bottom: 42 }}
                  accessibilityLayer
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="children"
                    name="Niños"
                    fill={chartPalette[0]}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState>
              No hay niños activos asociados a comunidades.
            </EmptyState>
          )}
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Mediciones recientes</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Últimos controles de crecimiento registrados.
          </p>
          {metrics.recentMeasurements.length ? (
            <ul className="space-y-2">
              {metrics.recentMeasurements.map((measurement) => (
                <li
                  className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2.5"
                  key={measurement.id}
                >
                  <Link
                    className="truncate text-sm font-medium hover:underline"
                    href={`/app/ninos/${measurement.childId}/crecimiento`}
                  >
                    {measurement.childName}
                  </Link>
                  <time
                    className="shrink-0 text-xs text-muted-foreground"
                    dateTime={measurement.measurementDate}
                  >
                    {new Intl.DateTimeFormat("es-GT", {
                      dateStyle: "medium",
                      timeZone: "UTC",
                    }).format(
                      new Date(`${measurement.measurementDate}T00:00:00Z`),
                    )}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>Aún no hay mediciones registradas.</EmptyState>
          )}
        </article>

        <article className="rounded-2xl border border-primary/70 bg-gradient-to-br from-primary to-[#063e50] p-5 text-white shadow-sm">
          <h2 className="font-semibold">Accesos rápidos</h2>
          <p className="mb-5 text-sm text-white/70">
            Continúa con las tareas más frecuentes.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {quickActions.map((action) => (
              <Link
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2"
                href={action.href}
                key={action.href}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </article>
      </section>

      <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        Las dosis pendientes y atrasadas son conteos de seguimiento derivados
        del esquema vigente. No se muestra cobertura porcentual porque no existe
        una metodología de denominador aprobada para este resumen.
      </p>
    </div>
  );
}
