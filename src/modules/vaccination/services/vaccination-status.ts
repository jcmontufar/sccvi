import { getCurrentBusinessDate } from "@/lib/date/business-date";
import { calculateExactAge } from "@/modules/growth/utils/exact-age";

export type VaccinationStatus = "APPLIED" | "PENDING" | "OVERDUE";

export type ScheduleTiming = {
  recommendedAgeMonths: number | null;
  recommendedAgeDays: number | null;
  minimumAgeMonths?: number | null;
  minimumAgeDays?: number | null;
  maximumAgeMonths: number | null;
  maximumAgeDays: number | null;
  maximumAgeExclusive: boolean;
};

export type ScheduleVersionApplicability = {
  code: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
};

export type DoseApplicability = {
  dateOfBirth: string;
  schedule: ScheduleTiming;
  version: ScheduleVersionApplicability;
  seriesStartTiming?: ScheduleTiming;
};

export type VaccinationScheduleEvaluationDose = ScheduleTiming & {
  id: string;
  doseCode: string | null;
  doseName: string | null;
  doseNumber: number;
  timingNote: string | null;
  vaccineName: string;
  vaccineOfficialCode: string | null;
};

export type RecordedVaccination = {
  id: string;
  vaccineScheduleId: string;
  applicationDate: string;
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

function getDateAtAge(dateOfBirth: string, months: number, days: number) {
  const birth = parseDateOnly(dateOfBirth);
  const targetYear =
    birth.getUTCFullYear() + Math.floor((birth.getUTCMonth() + months) / 12);
  const targetMonth = (birth.getUTCMonth() + months) % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  const target = new Date(
    Date.UTC(targetYear, targetMonth, Math.min(birth.getUTCDate(), lastDay)),
  );
  target.setUTCDate(target.getUTCDate() + days);
  return target.toISOString().slice(0, 10);
}

export function getScheduledDate(
  dateOfBirth: string,
  schedule: ScheduleTiming,
) {
  return getDateAtAge(
    dateOfBirth,
    schedule.recommendedAgeMonths ?? 0,
    schedule.recommendedAgeDays ?? 0,
  );
}

function getOpportunityWindow(dateOfBirth: string, schedule: ScheduleTiming) {
  const recommendedMonths = schedule.recommendedAgeMonths ?? 0;
  const recommendedDays = schedule.recommendedAgeDays ?? 0;
  return {
    start: getDateAtAge(
      dateOfBirth,
      schedule.minimumAgeMonths ?? recommendedMonths,
      schedule.minimumAgeDays ?? recommendedDays,
    ),
    end: getDateAtAge(
      dateOfBirth,
      schedule.maximumAgeMonths ?? recommendedMonths,
      schedule.maximumAgeDays ?? recommendedDays,
    ),
    endExclusive: schedule.maximumAgeExclusive,
  };
}

export function isDoseApplicableToVersion({
  dateOfBirth,
  schedule,
  version,
  seriesStartTiming,
}: DoseApplicability) {
  const opportunity = getOpportunityWindow(dateOfBirth, schedule);
  const endsBeforeVersion = opportunity.endExclusive
    ? opportunity.end <= version.effectiveFrom
    : opportunity.end < version.effectiveFrom;
  if (endsBeforeVersion) return false;
  if (version.effectiveTo && opportunity.start > version.effectiveTo) {
    return false;
  }

  if (seriesStartTiming) {
    const seriesStart = getScheduledDate(dateOfBirth, seriesStartTiming);
    if (seriesStart < version.effectiveFrom) return false;
    if (version.effectiveTo && seriesStart > version.effectiveTo) return false;
  }
  return true;
}

export function evaluateVaccinationDose(
  applicability: DoseApplicability,
  evaluationDate: string,
  applicationDate?: string | null,
): VaccinationStatus | null {
  if (applicationDate) return "APPLIED";
  if (!isDoseApplicableToVersion(applicability)) return null;
  return getVaccinationStatus(
    applicability.dateOfBirth,
    evaluationDate,
    applicability.schedule,
  );
}

export function evaluateVaccinationScheduleForChild(input: {
  dateOfBirth: string;
  evaluationDate: string;
  version: ScheduleVersionApplicability;
  schedules: readonly VaccinationScheduleEvaluationDose[];
  vaccinations: readonly RecordedVaccination[];
}) {
  const vaccinationsBySchedule = new Map(
    input.vaccinations.map((vaccination) => [
      vaccination.vaccineScheduleId,
      vaccination,
    ]),
  );
  const hexavalentSeriesStart = input.schedules.find(
    (schedule) =>
      schedule.vaccineOfficialCode === "HEXAVALENT" &&
      schedule.doseNumber === 1,
  );

  return input.schedules.flatMap((schedule) => {
    const vaccination = vaccinationsBySchedule.get(schedule.id);
    const applicability = {
      dateOfBirth: input.dateOfBirth,
      schedule,
      version: input.version,
      seriesStartTiming:
        schedule.vaccineOfficialCode === "HEXAVALENT"
          ? hexavalentSeriesStart
          : undefined,
    };
    const applicable = isDoseApplicableToVersion(applicability);
    const status = evaluateVaccinationDose(
      applicability,
      input.evaluationDate,
      vaccination?.applicationDate,
    );
    return status
      ? [
          {
            id: schedule.id,
            doseCode: schedule.doseCode ?? schedule.id,
            doseName: schedule.doseName ?? `Dosis ${schedule.doseNumber}`,
            vaccineName: schedule.vaccineName,
            scheduledDate: getScheduledDate(input.dateOfBirth, schedule),
            timingNote: schedule.timingNote,
            status,
            applicable,
            vaccinationId: vaccination?.id ?? null,
            applicationDate: vaccination?.applicationDate ?? null,
          },
        ]
      : [];
  });
}
