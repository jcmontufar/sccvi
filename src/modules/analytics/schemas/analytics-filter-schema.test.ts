import { describe, expect, it } from "vitest";

import { analyticsFilterSchema } from "@/modules/analytics/schemas/analytics-filter-schema";

const base = {
  from: "2026-01-01",
  to: "2026-09-06",
  cutoffDate: "2026-09-06",
};

describe("analytics filters", () => {
  it("parses contextual and population filters", () => {
    expect(
      analyticsFilterSchema.parse({
        ...base,
        minAgeMonths: "6",
        maxAgeMonths: "24",
        sex: "FEMALE",
        alertSeverity: "CRITICAL",
      }),
    ).toMatchObject({
      minAgeMonths: 6,
      maxAgeMonths: 24,
      sex: "FEMALE",
      alertSeverity: "CRITICAL",
    });
  });

  it("rejects inverted dates and age ranges", () => {
    expect(() =>
      analyticsFilterSchema.parse({ ...base, from: "2026-10-01" }),
    ).toThrow(/fecha inicial/i);
    expect(() =>
      analyticsFilterSchema.parse({
        ...base,
        minAgeMonths: "24",
        maxAgeMonths: "6",
      }),
    ).toThrow(/edad mínima/i);
    expect(() =>
      analyticsFilterSchema.parse({ ...base, cutoffDate: "2025-12-31" }),
    ).toThrow(/fecha de corte/i);
  });
});
