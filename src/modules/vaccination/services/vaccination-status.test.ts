import { describe, expect, it } from "vitest";

import {
  getScheduledDate,
  getVaccinationEvaluationDate,
  getVaccinationStatus,
  selectApplicableScheduleVersion,
} from "@/modules/vaccination/services/vaccination-status";

const twoMonthDose = {
  recommendedAgeMonths: 2,
  recommendedAgeDays: null,
  maximumAgeMonths: null,
  maximumAgeDays: null,
  maximumAgeExclusive: false,
};

describe("vaccination status engine", () => {
  it("is pending before and on the documented target date", () => {
    expect(getVaccinationStatus("2026-01-15", "2026-03-14", twoMonthDose)).toBe(
      "PENDING",
    );
    expect(getVaccinationStatus("2026-01-15", "2026-03-15", twoMonthDose)).toBe(
      "PENDING",
    );
  });

  it("is overdue after the documented target date without a grace period", () => {
    expect(getVaccinationStatus("2026-01-15", "2026-03-16", twoMonthDose)).toBe(
      "OVERDUE",
    );
  });

  it("is applied only when a factual application exists", () => {
    expect(
      getVaccinationStatus(
        "2026-01-15",
        "2026-08-25",
        twoMonthDose,
        "2026-03-20",
      ),
    ).toBe("APPLIED");
  });

  it("preserves a historical application regardless of current age", () => {
    expect(
      getVaccinationStatus(
        "2020-01-01",
        "2026-08-25",
        twoMonthDose,
        "2020-03-01",
      ),
    ).toBe("APPLIED");
  });

  it("handles birth and month-end boundaries deterministically", () => {
    expect(
      getVaccinationStatus("2026-08-25", "2026-08-25", {
        ...twoMonthDose,
        recommendedAgeMonths: null,
        recommendedAgeDays: 0,
      }),
    ).toBe("PENDING");
    expect(getScheduledDate("2026-01-31", twoMonthDose)).toBe("2026-03-31");
  });

  it("honors an exclusive documented age window", () => {
    const beforeOneYear = {
      ...twoMonthDose,
      recommendedAgeMonths: null,
      recommendedAgeDays: 0,
      maximumAgeMonths: 12,
      maximumAgeExclusive: true,
    };
    expect(
      getVaccinationStatus("2025-08-25", "2026-08-24", beforeOneYear),
    ).toBe("PENDING");
    expect(
      getVaccinationStatus("2025-08-25", "2026-08-25", beforeOneYear),
    ).toBe("OVERDUE");
  });

  it("uses America/Guatemala at the UTC boundary", () => {
    expect(
      getVaccinationEvaluationDate(new Date("2026-08-26T03:30:00.000Z")),
    ).toBe("2026-08-25");
  });

  it("selects the latest applicable version without rewriting events", () => {
    const versions = [
      { code: "OLD", effectiveFrom: "2025-01-01", effectiveTo: "2025-12-31" },
      { code: "CURRENT", effectiveFrom: "2026-01-01", effectiveTo: null },
    ];
    expect(selectApplicableScheduleVersion(versions, "2025-06-01")?.code).toBe(
      "OLD",
    );
    expect(selectApplicableScheduleVersion(versions, "2026-08-25")?.code).toBe(
      "CURRENT",
    );
  });
});
