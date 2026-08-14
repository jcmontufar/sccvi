import { describe, expect, it } from "vitest";

import { createGrowthRecordSchema } from "@/modules/growth/schemas/growth-record-schema";

const schema = createGrowthRecordSchema("2026-08-14");

describe("growth record validation", () => {
  it("accepts positive factual measurements", () => {
    expect(
      schema.safeParse({
        measurementDate: "2026-08-14",
        weightKg: "12.350",
        heightCm: "88.2",
        notes: "",
      }).success,
    ).toBe(true);
  });

  it("rejects future measurement dates", () => {
    expect(
      schema.safeParse({
        measurementDate: "2026-08-15",
        weightKg: 12,
        heightCm: 88,
        notes: "",
      }).success,
    ).toBe(false);
  });

  it("rejects non-positive measurements without inventing clinical ranges", () => {
    expect(
      schema.safeParse({
        measurementDate: "2026-08-14",
        weightKg: 0,
        heightCm: -1,
        notes: "",
      }).success,
    ).toBe(false);
  });
});
