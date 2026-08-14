import { describe, expect, it } from "vitest";

import { createGrowthRecordSchema } from "@/modules/growth/schemas/growth-record-schema";

const schema = createGrowthRecordSchema(new Date("2026-08-15T03:30:00.000Z"));

describe("growth record validation", () => {
  it("accepts positive factual measurements", () => {
    expect(
      schema.safeParse({
        measurementDate: "2026-08-14",
        weightKg: "12.350",
        heightCm: "88.2",
        measurementMethod: "STANDING_HEIGHT",
        notes: "",
      }).success,
    ).toBe(true);
  });

  it("rejects future measurement dates", () => {
    expect(
      schema.safeParse({
        measurementDate: "2026-08-16",
        weightKg: 12,
        heightCm: 88,
        measurementMethod: "STANDING_HEIGHT",
        notes: "",
      }).success,
    ).toBe(false);
  });

  it("treats the next UTC date as future while Guatemala is on the previous date", () => {
    expect(
      schema.safeParse({
        measurementDate: "2026-08-15",
        weightKg: 12,
        heightCm: 88,
        measurementMethod: "STANDING_HEIGHT",
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
        measurementMethod: "STANDING_HEIGHT",
        notes: "",
      }).success,
    ).toBe(false);
  });

  it("requires a scheduled follow-up to be after the measurement", () => {
    expect(
      schema.safeParse({
        measurementDate: "2026-08-14",
        weightKg: 12,
        heightCm: 88,
        measurementMethod: "STANDING_HEIGHT",
        nextFollowUpDate: "2026-08-14",
        notes: "",
      }).success,
    ).toBe(false);
  });
});
