import { describe, expect, it } from "vitest";

import {
  calculateDoseCoverage,
  growthAgeBand,
  isIncompleteVaccinationDose,
  matchesWeightPercentileReport,
} from "@/modules/reports/services/report-rules";
import { evaluateVaccinationScheduleForChild } from "@/modules/vaccination/services/vaccination-status";

const varicellaSchedule = {
  id: "varicella-1",
  doseCode: "VARICELLA_1",
  doseName: "Primera dosis",
  doseNumber: 1,
  timingNote: null,
  recommendedAgeMonths: 15,
  recommendedAgeDays: null,
  minimumAgeMonths: null,
  minimumAgeDays: null,
  maximumAgeMonths: null,
  maximumAgeDays: null,
  maximumAgeExclusive: false,
  vaccineName: "Varicela",
  vaccineOfficialCode: "VARICELLA",
};
const currentVersion = {
  code: "GT-MSPAS-2026-01-12",
  effectiveFrom: "2026-01-12",
  effectiveTo: null,
};

function varicellaCoverageChild(
  dateOfBirth: string,
  vaccinated: boolean,
  evaluationDate = "2026-08-28",
) {
  return {
    doses: evaluateVaccinationScheduleForChild({
      dateOfBirth,
      evaluationDate,
      version: currentVersion,
      schedules: [varicellaSchedule],
      vaccinations: vaccinated
        ? [
            {
              id: "vaccination-1",
              vaccineScheduleId: varicellaSchedule.id,
              applicationDate: "2026-04-12",
            },
          ]
        : [],
    }),
  };
}

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

  it("returns N/A when VARICELLA_1 predates version applicability", () => {
    const result = calculateDoseCoverage(
      [varicellaCoverageChild("2024-03-15", false)],
      "VARICELLA_1",
      "2026-08-28",
    );
    expect(result).toEqual({
      numerator: 0,
      denominator: 0,
      percentage: null,
    });
  });

  it("counts an eligible unvaccinated VARICELLA_1 child in the denominator", () => {
    const result = calculateDoseCoverage(
      [varicellaCoverageChild("2025-01-12", false)],
      "VARICELLA_1",
      "2026-08-28",
    );
    expect(result).toEqual({ numerator: 0, denominator: 1, percentage: 0 });
  });

  it("counts an eligible vaccinated VARICELLA_1 child in numerator and denominator", () => {
    const result = calculateDoseCoverage(
      [varicellaCoverageChild("2025-01-12", true)],
      "VARICELLA_1",
      "2026-08-28",
    );
    expect(result).toEqual({ numerator: 1, denominator: 1, percentage: 100 });
  });

  it("groups growth ages without mixing all child ages", () => {
    expect(growthAgeBand(0)).toBe("0–11 meses");
    expect(growthAgeBand(12)).toBe("12–23 meses");
    expect(growthAgeBand(24)).toBe("24–35 meses");
    expect(growthAgeBand(60)).toBe("48–60 meses");
  });
});
