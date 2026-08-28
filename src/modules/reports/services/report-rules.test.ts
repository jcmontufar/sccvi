import { describe, expect, it } from "vitest";

import {
  calculateDoseCoverage,
  growthAgeBand,
  isIncompleteVaccinationDose,
  matchesWeightPercentileReport,
} from "@/modules/reports/services/report-rules";

describe("report rules", () => {
  it("reuses strict percentile boundaries", () => {
    expect(matchesWeightPercentileReport(0.878, "low-weight")).toBe(true);
    expect(matchesWeightPercentileReport(4.9, "low-weight")).toBe(true);
    expect(matchesWeightPercentileReport(5, "low-weight")).toBe(false);
    expect(matchesWeightPercentileReport(95, "overweight")).toBe(false);
    expect(matchesWeightPercentileReport(95.1, "overweight")).toBe(true);
  });

  it("excludes future and historically inapplicable doses from incomplete", () => {
    expect(
      isIncompleteVaccinationDose(
        { applicable: true, status: "PENDING", scheduledDate: "2026-09-01" },
        "2026-08-15",
      ),
    ).toBe(false);
    expect(
      isIncompleteVaccinationDose(
        { applicable: false, status: "OVERDUE", scheduledDate: "2025-01-01" },
        "2026-08-15",
      ),
    ).toBe(false);
  });

  it("calculates per-dose coverage and returns null for zero denominator", () => {
    const children = [
      {
        doses: [
          {
            doseCode: "BCG-1",
            applicable: true,
            status: "APPLIED" as const,
            scheduledDate: "2026-01-01",
          },
        ],
      },
      {
        doses: [
          {
            doseCode: "BCG-1",
            applicable: true,
            status: "OVERDUE" as const,
            scheduledDate: "2026-01-01",
          },
        ],
      },
    ];
    expect(calculateDoseCoverage(children, "BCG-1", "2026-08-15")).toEqual({
      numerator: 1,
      denominator: 2,
      percentage: 50,
    });
    expect(
      calculateDoseCoverage(children, "FUTURE", "2026-08-15").percentage,
    ).toBeNull();
  });

  it("groups growth ages without mixing all child ages", () => {
    expect(growthAgeBand(0)).toBe("0–11 meses");
    expect(growthAgeBand(12)).toBe("12–23 meses");
    expect(growthAgeBand(24)).toBe("24–35 meses");
    expect(growthAgeBand(60)).toBe("48–60 meses");
  });
});
