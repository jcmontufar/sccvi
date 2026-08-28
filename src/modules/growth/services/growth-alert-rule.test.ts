import { describe, expect, it } from "vitest";

import { evaluateWeightForAgeAlert } from "@/modules/growth/services/growth-alert-rule";

describe("growth percentile alert rules", () => {
  it("creates non-diagnostic low-weight monitoring below percentile 5", () => {
    const result = evaluateWeightForAgeAlert("WEIGHT_FOR_AGE", 4.999);
    expect(result?.kind).toBe("LOW_WEIGHT");
    expect(result?.message).toContain("Requiere seguimiento");
    expect(result?.message).toContain("no constituye un diagnóstico");
  });

  it("does not alert at percentile 5", () => {
    expect(evaluateWeightForAgeAlert("WEIGHT_FOR_AGE", 5)).toBeNull();
  });

  it("creates non-diagnostic high-weight monitoring above percentile 95", () => {
    expect(evaluateWeightForAgeAlert("WEIGHT_FOR_AGE", 95.001)?.kind).toBe(
      "HIGH_WEIGHT",
    );
  });

  it("does not alert at percentile 95 or for height-for-age", () => {
    expect(evaluateWeightForAgeAlert("WEIGHT_FOR_AGE", 95)).toBeNull();
    expect(evaluateWeightForAgeAlert("HEIGHT_FOR_AGE", 1)).toBeNull();
  });
});
