export type ExactAge = {
  years: number;
  months: number;
  days: number;
  totalDays: number;
};

const millisecondsPerDay = 86_400_000;

function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError("Invalid date");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError("Invalid date");
  }
  return date;
}

function addMonthsClamped(date: Date, months: number) {
  const year =
    date.getUTCFullYear() + Math.floor((date.getUTCMonth() + months) / 12);
  const month = (date.getUTCMonth() + months) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)));
}

export function calculateExactAge(
  dateOfBirth: string,
  measurementDate: string,
): ExactAge {
  const birth = parseDateOnly(dateOfBirth);
  const measurement = parseDateOnly(measurementDate);
  if (measurement < birth)
    throw new RangeError("Measurement date precedes birth date");

  let monthsTotal =
    (measurement.getUTCFullYear() - birth.getUTCFullYear()) * 12 +
    measurement.getUTCMonth() -
    birth.getUTCMonth();
  let cursor = addMonthsClamped(birth, monthsTotal);
  if (cursor > measurement) {
    monthsTotal -= 1;
    cursor = addMonthsClamped(birth, monthsTotal);
  }

  return {
    years: Math.floor(monthsTotal / 12),
    months: monthsTotal % 12,
    days: Math.round(
      (measurement.getTime() - cursor.getTime()) / millisecondsPerDay,
    ),
    totalDays: Math.round(
      (measurement.getTime() - birth.getTime()) / millisecondsPerDay,
    ),
  };
}
