import { GROWTH_PERCENTILE_THRESHOLDS } from "@/modules/growth/services/growth-alert-rule";

export function matchesWeightPercentileReport(
  percentile: number,
  type: "low-weight" | "overweight",
) {
  return type === "low-weight"
    ? percentile < GROWTH_PERCENTILE_THRESHOLDS.lowWeight
    : percentile > GROWTH_PERCENTILE_THRESHOLDS.highWeight;
}

export function isIncompleteVaccinationDose(
  dose: {
    applicable: boolean;
    status: "APPLIED" | "PENDING" | "OVERDUE";
    scheduledDate: string;
  },
  evaluationDate: string,
) {
  return (
    dose.applicable &&
    dose.status !== "APPLIED" &&
    dose.scheduledDate <= evaluationDate
  );
}

export function calculateDoseCoverage(
  children: readonly {
    doses: readonly {
      doseCode: string;
      applicable: boolean;
      status: "APPLIED" | "PENDING" | "OVERDUE";
      scheduledDate: string;
    }[];
  }[],
  doseCode: string,
  evaluationDate: string,
) {
  let numerator = 0;
  let denominator = 0;
  for (const child of children) {
    const dose = child.doses.find((item) => item.doseCode === doseCode);
    if (!dose?.applicable || dose.scheduledDate > evaluationDate) continue;
    denominator += 1;
    if (dose.status === "APPLIED") numerator += 1;
  }
  return {
    numerator,
    denominator,
    percentage: denominator ? (numerator / denominator) * 100 : null,
  };
}

export function growthAgeBand(totalMonths: number) {
  if (totalMonths < 12) return "0–11 meses";
  if (totalMonths < 24) return "12–23 meses";
  if (totalMonths < 36) return "24–35 meses";
  if (totalMonths < 48) return "36–47 meses";
  return "48–60 meses";
}
