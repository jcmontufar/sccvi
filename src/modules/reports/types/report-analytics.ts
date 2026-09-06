export type ReportMetric = {
  label: string;
  value: number | string;
  description: string;
};

export type ReportChartDatum = {
  label: string;
  [key: string]: number | string | null;
};

export type ReportChart = {
  title: string;
  description: string;
  data: ReportChartDatum[];
  series: {
    key: string;
    label: string;
    color: string;
    unit?: string;
  }[];
};

export type ReportAnalytics = {
  metrics: ReportMetric[];
  charts: ReportChart[];
  emptyTitle: string;
  emptyDescription: string;
};
