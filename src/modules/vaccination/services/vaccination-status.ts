import { getCurrentBusinessDate } from "@/lib/date/business-date";
import { calculateExactAge } from "@/modules/growth/utils/exact-age";

export type VaccinationStatus = "APPLIED" | "PENDING" | "OVERDUE";

export type ScheduleTiming = {
  recommendedAgeMonths: number | null;
  recommendedAgeDays: number | null;
  maximumAgeMonths: number | null;
  maximumAgeDays: number | null;
  maximumAgeExclusive: boolean;
};

export type ScheduleVersionApplicability = {
  code: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
};

function agePosition(dateOfBirth: string, evaluationDate: string) {
  const age = calculateExactAge(dateOfBirth, evaluationDate);
  return { months: age.years * 12 + age.months, days: age.days };
}

function compareAge(
  age: { months: number; days: number },
  threshold: { months: number; days: number },
) {
  return age.months === threshold.months
    ? Math.sign(age.days - threshold.days)
    : Math.sign(age.months - threshold.months);
}

export function selectApplicableScheduleVersion(
  versions: readonly ScheduleVersionApplicability[],
  evaluationDate: string,
) {
  return versions
    .filter(
      (version) =>
        version.effectiveFrom <= evaluationDate &&
        (!version.effectiveTo || evaluationDate <= version.effectiveTo),
    )
    .sort((left, right) =>
      right.effectiveFrom.localeCompare(left.effectiveFrom),
    )[0];
}

export function getVaccinationEvaluationDate(currentInstant = new Date()) {
  return getCurrentBusinessDate({ currentInstant });
}

export function getVaccinationStatus(
  dateOfBirth: string,
  evaluationDate: string,
  schedule: ScheduleTiming,
  applicationDate?: string | null,
): VaccinationStatus {
  if (applicationDate) return "APPLIED";

  const age = agePosition(dateOfBirth, evaluationDate);
  const recommended = {
    months: schedule.recommendedAgeMonths ?? 0,
    days: schedule.recommendedAgeDays ?? 0,
  };
  const windowEnd = {
    months: schedule.maximumAgeMonths ?? recommended.months,
    days: schedule.maximumAgeDays ?? recommended.days,
  };
  const comparison = compareAge(age, windowEnd);
  const overdue = schedule.maximumAgeExclusive
    ? comparison >= 0
    : comparison > 0;
  return overdue ? "OVERDUE" : "PENDING";
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function getScheduledDate(
  dateOfBirth: string,
  schedule: ScheduleTiming,
) {
  const birth = parseDateOnly(dateOfBirth);
  const months = schedule.recommendedAgeMonths ?? 0;
  const targetYear =
    birth.getUTCFullYear() + Math.floor((birth.getUTCMonth() + months) / 12);
  const targetMonth = (birth.getUTCMonth() + months) % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  const target = new Date(
    Date.UTC(targetYear, targetMonth, Math.min(birth.getUTCDate(), lastDay)),
  );
  target.setUTCDate(target.getUTCDate() + (schedule.recommendedAgeDays ?? 0));
  return target.toISOString().slice(0, 10);
}
