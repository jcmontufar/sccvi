import { describe, expect, it } from "vitest";

import {
  defaultBusinessTimeZone,
  getCurrentBusinessDate,
} from "@/lib/date/business-date";

describe("getCurrentBusinessDate", () => {
  it("uses Guatemala's local calendar date at the UTC day boundary", () => {
    const currentInstant = new Date("2026-08-15T03:30:00.000Z");

    expect(defaultBusinessTimeZone).toBe("America/Guatemala");
    expect(getCurrentBusinessDate({ currentInstant })).toBe("2026-08-14");
  });

  it("allows a timezone to be injected for future configuration", () => {
    const currentInstant = new Date("2026-08-15T03:30:00.000Z");

    expect(getCurrentBusinessDate({ currentInstant, timeZone: "UTC" })).toBe(
      "2026-08-15",
    );
  });

  it("rejects an invalid current instant", () => {
    expect(() =>
      getCurrentBusinessDate({ currentInstant: new Date("invalid") }),
    ).toThrow(RangeError);
  });
});
