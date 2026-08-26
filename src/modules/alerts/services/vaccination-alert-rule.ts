import type { VaccinationStatus } from "@/modules/vaccination/services/vaccination-status";

export function shouldCreateVaccinationAlert(status: VaccinationStatus) {
  return status === "OVERDUE";
}

export function getVaccinationAlertIdentity(
  childId: string,
  vaccineScheduleId: string,
) {
  return {
    type: "VACCINATION" as const,
    sourceType: "VaccineSchedule",
    sourceId: `${childId}:${vaccineScheduleId}`,
  };
}
