import { describe, expect, it } from "vitest";

import { calculateExactAge } from "@/modules/growth/utils/exact-age";

describe("calculateExactAge", () => {
  it("returns zero on the birth date", () => {
    expect(calculateExactAge("2020-05-10", "2020-05-10")).toEqual({
      years: 0,
      months: 0,
      days: 0,
      totalDays: 0,
    });
  });

  it("handles the day before a birthday", () => {
    expect(calculateExactAge("2020-05-10", "2023-05-09")).toMatchObject({
      years: 2,
      months: 11,
      days: 29,
    });
  });

  it("handles an exact birthday", () => {
    expect(calculateExactAge("2020-05-10", "2023-05-10")).toMatchObject({
      years: 3,
      months: 0,
      days: 0,
    });
  });

  it("handles month-end boundaries by clamping", () => {
    expect(calculateExactAge("2023-01-31", "2023-02-28")).toMatchObject({
      years: 0,
      months: 1,
      days: 0,
    });
  });

  it("handles year boundaries", () => {
    expect(calculateExactAge("2022-12-31", "2023-01-01")).toMatchObject({
      years: 0,
      months: 0,
      days: 1,
    });
  });

  it("handles a leap-day birth date in a non-leap year", () => {
    expect(calculateExactAge("2020-02-29", "2021-02-28")).toMatchObject({
      years: 1,
      months: 0,
      days: 0,
    });
  });

  it("uses the historical measurement date", () => {
    expect(calculateExactAge("2018-07-15", "2020-01-20")).toMatchObject({
      years: 1,
      months: 6,
      days: 5,
    });
  });

  it("rejects a measurement before birth", () => {
    expect(() => calculateExactAge("2020-05-10", "2020-05-09")).toThrow(
      RangeError,
    );
  });
});
