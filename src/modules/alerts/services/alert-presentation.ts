import { GROWTH_PERCENTILE_ALERT_SOURCE } from "@/modules/alerts/services/growth-alert-service";
import { GROWTH_PERCENTILE_THRESHOLDS } from "@/modules/growth/services/growth-alert-rule";

export function getAlertSourceLabel(sourceType: string | null) {
  if (sourceType === GROWTH_PERCENTILE_ALERT_SOURCE) {
    return "Control de crecimiento — Peso para la edad";
  }
  if (sourceType === "VaccineSchedule") {
    return "Esquema de vacunación";
  }
  if (sourceType === "GrowthFollowUp") {
    return "Seguimiento de crecimiento";
  }
  return "Seguimiento general";
}

export function getGrowthPercentileThresholdLabel(percentile: number) {
  if (percentile < GROWTH_PERCENTILE_THRESHOLDS.lowWeight) return "Menor de 5";
  if (percentile > GROWTH_PERCENTILE_THRESHOLDS.highWeight)
    return "Mayor de 95";
  return null;
}

export function buildOpenAlertSummary(
  groups: readonly {
    status: "OPEN" | "REVIEWED" | "RESOLVED";
    severity: "PREVENTIVE" | "CRITICAL";
    type: "GROWTH" | "VACCINATION" | "MISSED_FOLLOW_UP";
    count: number;
  }[],
) {
  const open = groups.filter((group) => group.status === "OPEN");
  const count = (predicate: (group: (typeof open)[number]) => boolean) =>
    open.filter(predicate).reduce((total, group) => total + group.count, 0);
  return {
    open: count(() => true),
    preventive: count((group) => group.severity === "PREVENTIVE"),
    critical: count((group) => group.severity === "CRITICAL"),
    byType: {
      growth: count((group) => group.type === "GROWTH"),
      vaccination: count((group) => group.type === "VACCINATION"),
      followUp: count((group) => group.type === "MISSED_FOLLOW_UP"),
    },
  };
}
