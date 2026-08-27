import { describe, expect, it } from "vitest";

import {
  buildAgeDateRange,
  deduplicateGuardianIds,
  matchesVaccinationSegmentation,
} from "@/modules/campaigns/services/campaign-segmentation";

describe("campaign age segmentation", () => {
  it("builds deterministic inclusive birth-date bounds", () => {
    const range = buildAgeDateRange(
      { minimumAgeYears: 2, maximumAgeYears: 5 },
      new Date("2026-08-14T12:00:00.000Z"),
    );
    expect(range.gte?.toISOString()).toBe("2020-08-15T00:00:00.000Z");
    expect(range.lte?.toISOString()).toBe("2024-08-14T00:00:00.000Z");
  });

  it("uses the Guatemala date when UTC is already on the following day", () => {
    const range = buildAgeDateRange(
      { minimumAgeYears: 2, maximumAgeYears: 5 },
      new Date("2026-08-15T03:30:00.000Z"),
    );
    expect(range.gte?.toISOString()).toBe("2020-08-15T00:00:00.000Z");
    expect(range.lte?.toISOString()).toBe("2024-08-14T00:00:00.000Z");
  });

  it.each(["APPLIED", "PENDING", "OVERDUE"] as const)(
    "matches the exact version, dose and %s state",
    (doseStatus) => {
      expect(
        matchesVaccinationSegmentation(
          {
            scheduleVersionCode: "GT-MSPAS-2026-01-12",
            doseCode: "BCG-BIRTH",
            doseStatus,
          },
          "GT-MSPAS-2026-01-12",
          [{ doseCode: "BCG-BIRTH", status: doseStatus }],
        ),
      ).toBe(true);
    },
  );

  it("does not match another version or an omitted inapplicable dose", () => {
    const segmentation = {
      scheduleVersionCode: "GT-MSPAS-2026-01-12",
      doseCode: "HEX-1",
      doseStatus: "OVERDUE" as const,
    };
    expect(
      matchesVaccinationSegmentation(segmentation, "OTHER", [
        { doseCode: "HEX-1", status: "OVERDUE" },
      ]),
    ).toBe(false);
    expect(
      matchesVaccinationSegmentation(segmentation, "GT-MSPAS-2026-01-12", []),
    ).toBe(false);
  });

  it("deduplicates a guardian matched by more than one child", () => {
    expect(deduplicateGuardianIds(["guardian-1", "guardian-1"])).toEqual([
      "guardian-1",
    ]);
  });
});
