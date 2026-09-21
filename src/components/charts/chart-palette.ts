export const chartPalette = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
] as const;

export const semanticChartColors = {
  applied: "var(--success)",
  pending: "var(--warning)",
  overdue: "var(--destructive)",
  critical: "var(--destructive)",
  preventive: "var(--warning)",
} as const;
