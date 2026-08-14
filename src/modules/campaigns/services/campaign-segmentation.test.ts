import { describe, expect, it } from "vitest";

import { buildAgeDateRange } from "@/modules/campaigns/services/campaign-segmentation";

describe("campaign age segmentation", () => {
  it("builds deterministic inclusive birth-date bounds", () => {
    const range = buildAgeDateRange(
      { minimumAgeYears: 2, maximumAgeYears: 5 },
      new Date("2026-08-14T00:00:00.000Z"),
    );
    expect(range.gte?.toISOString()).toBe("2020-08-15T00:00:00.000Z");
    expect(range.lte?.toISOString()).toBe("2024-08-14T00:00:00.000Z");
  });
});
