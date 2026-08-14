import { describe, expect, it } from "vitest";

import {
  calculateLmsZScore,
  normalizeLengthHeight,
  referenceMedianForMeasurementMethod,
  selectGrowthReference,
  zScoreToPercentile,
} from "@/modules/growth/services/growth-assessment-engine";

describe("WHO LMS growth assessment", () => {
  const sexReferences = [
    {
      standardName: "WHO Child Growth Standards",
      standardVersion: "2006",
      sex: "MALE" as const,
      ageDays: 0,
      indicator: "WEIGHT_FOR_AGE" as const,
      l: 0.3487,
      m: 3.3464,
      s: 0.14602,
    },
    {
      standardName: "WHO Child Growth Standards",
      standardVersion: "2006",
      sex: "FEMALE" as const,
      ageDays: 0,
      indicator: "WEIGHT_FOR_AGE" as const,
      l: 0.3809,
      m: 3.2322,
      s: 0.14171,
    },
  ];

  it("returns zero at the official male birth median for weight", () => {
    expect(
      calculateLmsZScore(3.3464, {
        indicator: "WEIGHT_FOR_AGE",
        l: 0.3487,
        m: 3.3464,
        s: 0.14602,
      }),
    ).toBeCloseTo(0, 10);
  });

  it("returns zero at the official female birth median for length", () => {
    expect(
      calculateLmsZScore(49.1477, {
        indicator: "HEIGHT_FOR_AGE",
        l: 1,
        m: 49.1477,
        s: 0.0379,
      }),
    ).toBeCloseTo(0, 10);
  });

  it("matches the WHO training example for a 28-month-old boy", () => {
    expect(
      calculateLmsZScore(11.9, {
        indicator: "WEIGHT_FOR_AGE",
        l: -0.06,
        m: 12.94,
        s: 0.12,
      }),
    ).toBeCloseTo(-0.7, 2);
  });

  it("selects the exact version, sex, age and indicator", () => {
    expect(
      selectGrowthReference(sexReferences, {
        standardName: "WHO Child Growth Standards",
        standardVersion: "2006",
        sex: "FEMALE",
        ageDays: 0,
        indicator: "WEIGHT_FOR_AGE",
      }).m,
    ).toBe(3.2322);
  });

  it("rejects invalid ages and missing references", () => {
    expect(() =>
      selectGrowthReference(sexReferences, {
        standardName: "WHO Child Growth Standards",
        standardVersion: "2006",
        sex: "MALE",
        ageDays: -1,
        indicator: "WEIGHT_FOR_AGE",
      }),
    ).toThrow(RangeError);
    expect(() =>
      selectGrowthReference(sexReferences, {
        standardName: "WHO Child Growth Standards",
        standardVersion: "2006",
        sex: "MALE",
        ageDays: 1856,
        indicator: "WEIGHT_FOR_AGE",
      }),
    ).toThrow(RangeError);
  });

  it("is deterministic for positive and negative z-scores", () => {
    const reference = sexReferences[0];
    const lower = calculateLmsZScore(3, reference);
    const upper = calculateLmsZScore(4, reference);
    expect(lower).toBeLessThan(0);
    expect(upper).toBeGreaterThan(0);
    expect(calculateLmsZScore(4, reference)).toBe(upper);
  });

  it("uses the WHO restricted LMS extension beyond three SD for weight", () => {
    const reference = {
      indicator: "WEIGHT_FOR_AGE" as const,
      l: 0.3487,
      m: 3.3464,
      s: 0.14602,
    };
    const z3 =
      reference.m *
      Math.pow(1 + 3 * reference.l * reference.s, 1 / reference.l);
    const z2 =
      reference.m *
      Math.pow(1 + 2 * reference.l * reference.s, 1 / reference.l);
    expect(calculateLmsZScore(z3 + (z3 - z2), reference)).toBeCloseTo(4, 10);
  });

  it("converts standing height to recumbent length below 731 days", () => {
    expect(normalizeLengthHeight(75, 730, "STANDING_HEIGHT")).toBeCloseTo(75.7);
  });

  it("converts recumbent length to standing height from 731 days", () => {
    expect(normalizeLengthHeight(88, 731, "RECUMBENT_LENGTH")).toBeCloseTo(
      87.3,
    );
  });

  it("expresses the WHO median in the factual measurement method for charts", () => {
    expect(
      referenceMedianForMeasurementMethod(75.7, 730, "STANDING_HEIGHT"),
    ).toBeCloseTo(75);
    expect(
      referenceMedianForMeasurementMethod(87.3, 731, "RECUMBENT_LENGTH"),
    ).toBeCloseTo(88);
  });

  it("converts z-scores to percentiles", () => {
    expect(zScoreToPercentile(0)).toBeCloseTo(50, 4);
    expect(zScoreToPercentile(1)).toBeCloseTo(84.134, 2);
  });
});
