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
