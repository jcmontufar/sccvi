import { describe, expect, it } from "vitest";

import { suggestNextGrowthFollowUpDate } from "@/modules/growth/services/follow-up-suggestion";

describe("growth follow-up suggestion", () => {
  it("suggests monthly follow-up before two years", () => {
    expect(suggestNextGrowthFollowUpDate("2024-08-16", "2026-08-15")).toBe(
      "2026-09-15",
    );
  });

  it("switches to quarterly at exactly two years", () => {
    expect(suggestNextGrowthFollowUpDate("2024-08-15", "2026-08-15")).toBe(
      "2026-11-15",
    );
  });

  it("suggests quarterly before five years and none at five years", () => {
    expect(suggestNextGrowthFollowUpDate("2021-08-16", "2026-08-15")).toBe(
      "2026-11-15",
    );
    expect(
      suggestNextGrowthFollowUpDate("2021-08-15", "2026-08-15"),
    ).toBeNull();
  });
});
