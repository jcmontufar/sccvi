"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type GrowthPoint = {
  ageDays: number;
  date: string;
  weightKg: number;
  heightCm: number;
  whoWeightMedianKg: number | null;
  whoHeightMedianCm: number | null;
};

export const GROWTH_CHART_REFERENCE_LABEL = "Referencia OMS";

function MeasurementChart({
  data,
  dataKey,
  title,
  unit,
  referenceKey,
}: {
  data: GrowthPoint[];
  dataKey: "weightKg" | "heightCm";
  title: string;
  unit: string;
  referenceKey: "whoWeightMedianKg" | "whoHeightMedianCm";
}) {
  return (
    <article className="rounded-xl border bg-card p-4">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div
        aria-label={`Gráfica de ${title}`}
        className="h-72 w-full"
        role="img"
      >
        <p className="sr-only">
          {data.length} mediciones comparadas con la referencia OMS disponible.
        </p>
        <ResponsiveContainer height="100%" width="100%">
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ left: 4, right: 16, top: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="ageDays"
              label={{
                value: "Edad (días)",
                position: "insideBottom",
                offset: -4,
              }}
              minTickGap={24}
            />
            <YAxis
              domain={["auto", "auto"]}
              label={{ value: unit, angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              formatter={(value, name) => [
                `${String(value)} ${unit}`,
                String(name),
              ]}
              labelFormatter={(_, payload) => payload[0]?.payload.date ?? ""}
            />
            <Line
              activeDot={{ r: 5 }}
              dataKey={dataKey}
              dot
              name={title}
              stroke="var(--primary)"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              connectNulls={false}
              dataKey={referenceKey}
              dot={false}
              name={GROWTH_CHART_REFERENCE_LABEL}
              stroke="var(--muted-foreground)"
              strokeDasharray="6 4"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

export function GrowthHistoryCharts({ data }: { data: GrowthPoint[] }) {
  if (!data.length) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <MeasurementChart
        data={data}
        dataKey="weightKg"
        title="Peso registrado"
        unit="kg"
        referenceKey="whoWeightMedianKg"
      />
      <MeasurementChart
        data={data}
        dataKey="heightCm"
        title="Talla registrada"
        unit="cm"
        referenceKey="whoHeightMedianCm"
      />
    </div>
  );
}
