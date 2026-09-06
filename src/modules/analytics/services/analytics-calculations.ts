export function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function monthKey(value: Date | string) {
  return typeof value === "string"
    ? value.slice(0, 7)
    : value.toISOString().slice(0, 7);
}

export function differenceInCalendarDays(later: string, earlier: string) {
  return Math.max(
    0,
    Math.floor(
      (Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) /
        86_400_000,
    ),
  );
}

export function coveragePercentage(applied: number, eligible: number) {
  return eligible === 0 ? null : Math.round((applied / eligible) * 1000) / 10;
}

export function isLowWeightPercentile(value: number | null) {
  return value !== null && value < 5;
}

export function isHighWeightPercentile(value: number | null) {
  return value !== null && value > 95;
}
