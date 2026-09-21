"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { semanticChartColors } from "@/components/charts/chart-palette";

const items = [
  { key: "APPLIED", label: "Aplicadas", color: semanticChartColors.applied },
  { key: "PENDING", label: "Pendientes", color: semanticChartColors.pending },
  { key: "OVERDUE", label: "Atrasadas", color: semanticChartColors.overdue },
] as const;

export function VaccinationSummaryChart({
  counts,
}: {
  counts: Record<(typeof items)[number]["key"], number>;
}) {
  const data = items
    .map((item) => ({ ...item, value: counts[item.key] }))
    .filter((item) => item.value > 0);

  if (!data.length) {
    return (
      <div className="flex h-52 items-center justify-center rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        No hay dosis aplicables para mostrar.
      </div>
    );
  }

  return (
    <div>
      <div
        aria-label="Resumen gráfico del estado de vacunación"
        className="h-48"
        role="img"
      >
        <ResponsiveContainer height="100%" width="100%">
          <PieChart accessibilityLayer>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={48}
              nameKey="label"
              outerRadius={72}
              paddingAngle={3}
            >
              {data.map((item) => (
                <Cell fill={item.color} key={item.key} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} dosis`, "Estado"]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-3 text-xs">
        {data.map((item) => (
          <span className="flex items-center gap-1.5" key={item.key}>
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}: {item.value}
          </span>
        ))}
      </div>
    </div>
  );
}
