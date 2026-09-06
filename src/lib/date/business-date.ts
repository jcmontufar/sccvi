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

function businessLocalTimeToUtc(date: string, hour: number, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const nominalUtc = Date.UTC(year, month - 1, day, hour);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(nominalUtc));
  const values = Object.fromEntries(
    parts
      .filter(({ type }) => ["year", "month", "day", "hour"].includes(type))
      .map(({ type, value }) => [type, Number(value)]),
  );
  const offset =
    Date.UTC(values.year, values.month - 1, values.day, values.hour) -
    nominalUtc;
  return new Date(nominalUtc - offset);
}

export function getBusinessDateUtcRange(
  date: string,
  timeZone = defaultBusinessTimeZone,
) {
  const start = businessLocalTimeToUtc(date, 0, timeZone);
  const nextDate = new Date(`${date}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const nextStart = businessLocalTimeToUtc(
    nextDate.toISOString().slice(0, 10),
    0,
    timeZone,
  );
  return { start, end: new Date(nextStart.getTime() - 1) };
}
