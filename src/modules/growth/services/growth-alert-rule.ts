export const GROWTH_PERCENTILE_THRESHOLDS = {
  lowWeight: 5,
  highWeight: 95,
} as const;

export type GrowthAlertRuleResult = {
  kind: "LOW_WEIGHT" | "HIGH_WEIGHT";
  title: string;
  message: string;
} | null;

export function evaluateWeightForAgeAlert(
  indicator: "WEIGHT_FOR_AGE" | "HEIGHT_FOR_AGE",
  percentile: number | null,
): GrowthAlertRuleResult {
  if (indicator !== "WEIGHT_FOR_AGE" || percentile === null) return null;
  if (percentile < GROWTH_PERCENTILE_THRESHOLDS.lowWeight) {
    return {
      kind: "LOW_WEIGHT",
      title: "Seguimiento por percentil de peso bajo",
      message:
        "Percentil de peso para la edad por debajo de 5. Requiere seguimiento por personal de salud. Esta alerta no constituye un diagnóstico médico.",
    };
  }
  if (percentile > GROWTH_PERCENTILE_THRESHOLDS.highWeight) {
    return {
      kind: "HIGH_WEIGHT",
      title: "Seguimiento por percentil de peso alto",
      message:
        "Percentil de peso para la edad por encima de 95. Requiere seguimiento por personal de salud. Esta alerta no constituye un diagnóstico médico.",
    };
  }
  return null;
}
