export const defaultBusinessTimeZone = "America/Guatemala";

export type BusinessDateOptions = {
  currentInstant?: Date;
  timeZone?: string;
};

export function getCurrentBusinessDate({
  currentInstant = new Date(),
  timeZone = defaultBusinessTimeZone,
}: BusinessDateOptions = {}) {
  if (Number.isNaN(currentInstant.getTime())) {
    throw new RangeError("Invalid current instant");
  }

  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(currentInstant);
  const values = Object.fromEntries(
    dateParts
      .filter(
        ({ type }) => type === "year" || type === "month" || type === "day",
      )
      .map(({ type, value }) => [type, value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}
