import type { EvaluatedVaccinationDose } from "@/modules/vaccination/services/vaccination-status";
import { calculateExactAge } from "@/modules/growth/utils/exact-age";

function getStageLabel(dateOfBirth: string, scheduledDate: string) {
  const age = calculateExactAge(dateOfBirth, scheduledDate);
  if (age.years === 0 && age.months === 0 && age.days === 0) {
    return "Nacimiento";
  }
  if (age.years === 0 && age.months === 0) {
    return `${age.days} ${age.days === 1 ? "día" : "días"}`;
  }
  if (age.years === 0) {
    return `${age.months} ${age.months === 1 ? "mes" : "meses"}`;
  }
  if (age.months === 0) {
    return `${age.years} ${age.years === 1 ? "año" : "años"}`;
  }
  return `${age.years} ${age.years === 1 ? "año" : "años"} y ${age.months} ${age.months === 1 ? "mes" : "meses"}`;
}

export function buildVaccinationTimeline(
  dateOfBirth: string,
  doses: readonly EvaluatedVaccinationDose[],
) {
  const groups = new Map<
    string,
    {
      scheduledDate: string;
      stageLabel: string;
      doses: EvaluatedVaccinationDose[];
    }
  >();
  for (const dose of [...doses].sort((left, right) =>
    left.scheduledDate.localeCompare(right.scheduledDate),
  )) {
    const existing = groups.get(dose.scheduledDate) ?? {
      scheduledDate: dose.scheduledDate,
      stageLabel: getStageLabel(dateOfBirth, dose.scheduledDate),
      doses: [],
    };
    existing.doses.push(dose);
    groups.set(dose.scheduledDate, existing);
  }
  return [...groups.values()];
}

export function getVaccinationAttention(
  doses: readonly EvaluatedVaccinationDose[],
) {
  const overdue = doses.filter((dose) => dose.status === "OVERDUE");
  const nextPending = doses
    .filter((dose) => dose.status === "PENDING")
    .sort((left, right) =>
      left.scheduledDate.localeCompare(right.scheduledDate),
    )[0];
  return { overdue, nextPending: nextPending ?? null };
}
