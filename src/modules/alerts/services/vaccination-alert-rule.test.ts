import { describe, expect, it } from "vitest";

import {
  getVaccinationAlertIdentity,
  shouldCreateVaccinationAlert,
} from "@/modules/alerts/services/vaccination-alert-rule";
import { evaluateVaccinationDose } from "@/modules/vaccination/services/vaccination-status";

const twoMonthDose = {
  recommendedAgeMonths: 2,
  recommendedAgeDays: null,
  maximumAgeMonths: null,
  maximumAgeDays: null,
  maximumAgeExclusive: false,
};

const currentVersion = {
  code: "GT-MSPAS-2026-01-12",
  effectiveFrom: "2026-01-12",
  effectiveTo: null,
};

describe("vaccination alert rule", () => {
  it("creates follow-up only for an overdue dose", () => {
    expect(shouldCreateVaccinationAlert("OVERDUE")).toBe(true);
    expect(shouldCreateVaccinationAlert("PENDING")).toBe(false);
    expect(shouldCreateVaccinationAlert("APPLIED")).toBe(false);
    expect(shouldCreateVaccinationAlert(null)).toBe(false);
  });

  it("does not alert for an inapplicable historical hexavalent opportunity", () => {
    const status = evaluateVaccinationDose(
      {
        dateOfBirth: "2024-01-01",
        schedule: twoMonthDose,
        seriesStartTiming: twoMonthDose,
        version: currentVersion,
      },
      "2026-08-25",
    );
    expect(status).toBeNull();
    expect(shouldCreateVaccinationAlert(status)).toBe(false);
  });

  it("still alerts for a valid current overdue dose", () => {
    const status = evaluateVaccinationDose(
      {
        dateOfBirth: "2025-12-01",
        schedule: twoMonthDose,
        seriesStartTiming: twoMonthDose,
        version: currentVersion,
      },
      "2026-03-01",
    );
    expect(status).toBe("OVERDUE");
    expect(shouldCreateVaccinationAlert(status)).toBe(true);
  });

  it("uses one deterministic identity per child and scheduled dose", () => {
    const first = getVaccinationAlertIdentity("child-1", "dose-1");
    expect(getVaccinationAlertIdentity("child-1", "dose-1")).toEqual(first);
    expect(getVaccinationAlertIdentity("child-2", "dose-1")).not.toEqual(first);
  });
});
