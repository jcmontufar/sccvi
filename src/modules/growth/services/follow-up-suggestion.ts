import { calculateExactAge } from "@/modules/growth/utils/exact-age";

function addMonthsClamped(dateOnly: string, months: number) {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const targetMonth = month - 1 + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0),
  ).getUTCDate();
  return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay)))
    .toISOString()
    .slice(0, 10);
}

export function suggestNextGrowthFollowUpDate(
  dateOfBirth: string,
  measurementDate: string,
) {
  const age = calculateExactAge(dateOfBirth, measurementDate);
  const totalMonths = age.years * 12 + age.months;
  if (totalMonths < 24) return addMonthsClamped(measurementDate, 1);
  if (totalMonths < 60) return addMonthsClamped(measurementDate, 3);
  return null;
}
