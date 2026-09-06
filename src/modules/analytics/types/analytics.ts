import type { AnalyticsFilters } from "@/modules/analytics/schemas/analytics-filter-schema";

export type AnalyticsTrend = {
  period: string;
  label: string;
  measurements: number;
  measuredChildren: number;
  vaccinations: number;
  alertsGenerated: number;
  alertsResolved: number;
  followUpsDue: number;
  followUpsCompleted: number;
};

export type TerritorialAnalytics = {
  communityId: string;
  community: string;
  healthCenter: string;
  children: number;
  measurements: number;
  overdueFollowUps: number;
  overdueDoses: number;
  openAlerts: number;
  criticalAlerts: number;
  lowPercentile: number;
  highPercentile: number;
};

export type AnalyticsPriority = {
  id: string;
  childId: string;
  childName: string;
  community: string;
  label: string;
  date: string;
  daysPending: number;
};

export type AnalyticsResult = {
  filters: AnalyticsFilters;
  summary: {
    activeChildren: number;
    measurements: number;
    overdueFollowUps: number;
    overdueDoses: number;
    openAlerts: number;
    criticalAlerts: number;
  };
  trends: AnalyticsTrend[];
  territories: TerritorialAnalytics[];
  vaccination: {
    versionCode: string;
    doseCode: string;
    coverage: Array<{
      communityId: string;
      community: string;
      applied: number;
      eligible: number;
      percentage: number | null;
    }>;
    overdueByCommunity: Array<{ label: string; value: number }>;
  };
  growth: {
    lowEvaluations: number;
    lowChildren: number;
    highEvaluations: number;
    highChildren: number;
  };
  priorities: {
    followUps: AnalyticsPriority[];
    vaccinations: AnalyticsPriority[];
    alerts: AnalyticsPriority[];
  };
  options: {
    healthCenters: Array<{ id: string; name: string }>;
    communities: Array<{ id: string; name: string }>;
    doses: Array<{ doseCode: string; label: string }>;
  };
  processing: { vaccinationPages: number; childrenEvaluated: number };
};
