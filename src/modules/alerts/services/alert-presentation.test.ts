import { describe, expect, it } from "vitest";

import {
  buildOpenAlertSummary,
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

  it("summarizes only open alerts using existing severity and type values", () => {
    expect(
      buildOpenAlertSummary([
        {
          status: "OPEN",
          severity: "PREVENTIVE",
          type: "GROWTH",
          count: 3,
        },
        {
          status: "OPEN",
          severity: "CRITICAL",
          type: "VACCINATION",
          count: 1,
        },
        {
          status: "OPEN",
          severity: "PREVENTIVE",
          type: "MISSED_FOLLOW_UP",
          count: 2,
        },
        {
          status: "RESOLVED",
          severity: "CRITICAL",
          type: "GROWTH",
          count: 8,
        },
      ]),
    ).toEqual({
      open: 6,
      preventive: 5,
      critical: 1,
      byType: { growth: 3, vaccination: 1, followUp: 2 },
    });
  });
});
