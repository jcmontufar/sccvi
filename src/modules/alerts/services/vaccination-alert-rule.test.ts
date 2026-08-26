import { describe, expect, it } from "vitest";

import {
  getVaccinationAlertIdentity,
  shouldCreateVaccinationAlert,
} from "@/modules/alerts/services/vaccination-alert-rule";

describe("vaccination alert rule", () => {
  it("creates follow-up only for an overdue dose", () => {
    expect(shouldCreateVaccinationAlert("OVERDUE")).toBe(true);
    expect(shouldCreateVaccinationAlert("PENDING")).toBe(false);
    expect(shouldCreateVaccinationAlert("APPLIED")).toBe(false);
  });

  it("uses one deterministic identity per child and scheduled dose", () => {
    const first = getVaccinationAlertIdentity("child-1", "dose-1");
    expect(getVaccinationAlertIdentity("child-1", "dose-1")).toEqual(first);
    expect(getVaccinationAlertIdentity("child-2", "dose-1")).not.toEqual(first);
  });
});
