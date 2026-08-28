import { describe, expect, it } from "vitest";

import {
  getAlertSourceLabel,
  getGrowthPercentileThresholdLabel,
} from "@/modules/alerts/services/alert-presentation";

describe("alert presentation", () => {
  it("renders the technical growth source as a Spanish label", () => {
    expect(getAlertSourceLabel("GROWTH_ASSESSMENT_WEIGHT_PERCENTILE")).toBe(
      "Control de crecimiento — Peso para la edad",
    );
  });

  it("renders only approved percentile threshold context", () => {
    expect(getGrowthPercentileThresholdLabel(0.878)).toBe("Menor de 5");
    expect(getGrowthPercentileThresholdLabel(99)).toBe("Mayor de 95");
    expect(getGrowthPercentileThresholdLabel(5)).toBeNull();
    expect(getGrowthPercentileThresholdLabel(95)).toBeNull();
  });
});
