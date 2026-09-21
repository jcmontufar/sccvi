"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  chartPalette,
  semanticChartColors,
} from "@/components/charts/chart-palette";
import { ChartCard } from "@/components/charts/chart-card";
import { EmptyState } from "@/components/ui/empty-state";
import type { ReportAnalytics as ReportAnalyticsData } from "@/modules/reports/types/report-analytics";

function reportSeriesColor(key: string, index: number) {
  if (key === "applied") return semanticChartColors.applied;
  if (key === "pending") return semanticChartColors.pending;
  if (key === "overdue" || key === "critical") {
    return semanticChartColors.critical;
  }
  return chartPalette[index % chartPalette.length];
}

function AnalyticsTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{
    name?: string;
    value?: number | string;
    unit?: string;
    payload?: Record<string, unknown>;
  }>;
}) {
  if (!active || !payload?.length) return null;
  const detail = payload[0]?.payload?.detail;
  return (
    <div className="max-w-64 rounded-lg border bg-background px-3 py-2 text-xs shadow-lg">
      <p className="font-medium">{label}</p>
      {payload.map((item) => (
        <p className="text-muted-foreground" key={item.name}>
          {item.name}: {item.value ?? "N/A"}
          {item.unit ?? ""}
        </p>
      ))}
      {typeof detail === "string" ? (
        <p className="mt-1 text-muted-foreground">
          Aplicadas/elegibles: {detail}
        </p>
      ) : null}
    </div>
  );
}

export function ReportAnalytics({
  analytics,
}: {
  analytics: ReportAnalyticsData;
}) {
  return (
    <div className="space-y-4">
      {analytics.metrics.length ? (
        <section
          aria-label="Indicadores del resultado generado"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          {analytics.metrics.map((metric) => (
            <article
              className="rounded-2xl border bg-card p-4 shadow-sm"
              key={metric.label}
            >
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {metric.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {metric.description}
              </p>
            </article>
          ))}
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {analytics.charts.map((chart) => {
          const height = Math.max(260, Math.min(chart.data.length * 42, 520));
          const hasValues = chart.data.some((item) =>
            chart.series.some(
              (series) =>
                typeof item[series.key] === "number" &&
                Number(item[series.key]) > 0,
            ),
          );
          return (
            <ChartCard
              description={chart.description}
              key={chart.title}
              summary={`${chart.data.length} categorías representadas.`}
              title={chart.title}
            >
              {chart.data.length && hasValues ? (
                <div
                  aria-label={chart.title}
                  className="w-full"
                  role="img"
                  style={{ height }}
                >
                  <ResponsiveContainer height="100%" width="100%">
                    <BarChart
                      accessibilityLayer
                      data={chart.data}
                      layout="vertical"
                      margin={{ left: 8, right: 24 }}
                    >
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis allowDecimals={false} type="number" />
                      <YAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        type="category"
                        width={120}
                      />
                      <Tooltip content={<AnalyticsTooltip />} />
                      {chart.series.length > 1 ? <Legend /> : null}
                      {chart.series.map((series, index) => (
                        <Bar
                          dataKey={series.key}
                          fill={reportSeriesColor(series.key, index)}
                          key={series.key}
                          name={series.label}
                          radius={[0, 5, 5, 0]}
                          unit={series.unit}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState className="min-h-28">
                  No hay valores para representar en esta gráfica.
                </EmptyState>
              )}
              {chart.data.some((item) => item.detail === "N/A") ? (
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {chart.data
                    .filter((item) => item.detail === "N/A")
                    .map((item) => (
                      <span
                        className="rounded-full border px-2.5 py-1"
                        key={item.label}
                      >
                        {item.label}: N/A
                      </span>
                    ))}
                </div>
              ) : null}
            </ChartCard>
          );
        })}
      </div>
    </div>
  );
}
