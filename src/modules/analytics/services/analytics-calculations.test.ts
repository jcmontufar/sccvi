import { describe, expect, it } from "vitest";

import {
  coveragePercentage,
  differenceInCalendarDays,
  isHighWeightPercentile,
  isLowWeightPercentile,
  monthKey,
} from "@/modules/analytics/services/analytics-calculations";

describe("analytics calculations", () => {
  it("represents coverage N/A, 0% and 100% without inventing a denominator", () => {
    expect(coveragePercentage(0, 0)).toBeNull();
    expect(coveragePercentage(0, 1)).toBe(0);
    expect(coveragePercentage(1, 1)).toBe(100);
  });

  it("keeps percentile evaluations separate from unique-child counting", () => {
    const evaluations = [
      { childId: "a", percentile: 4.9 },
      { childId: "a", percentile: 3 },
      { childId: "b", percentile: 96 },
      { childId: "c", percentile: 5 },
      { childId: "d", percentile: 95 },
    ];
    const low = evaluations.filter(({ percentile }) =>
      isLowWeightPercentile(percentile),
    );
    const high = evaluations.filter(({ percentile }) =>
      isHighWeightPercentile(percentile),
    );
    expect(low).toHaveLength(2);
    expect(new Set(low.map(({ childId }) => childId)).size).toBe(1);
    expect(high).toHaveLength(1);
    expect(new Set(high.map(({ childId }) => childId)).size).toBe(1);
  });

  it("calculates operational age in calendar days deterministically", () => {
    expect(differenceInCalendarDays("2026-09-06", "2026-09-01")).toBe(5);
    expect(monthKey("2026-09-06")).toBe("2026-09");
  });
});
