import { describe, expect, it } from "vitest";

import { createVaccinationInputSchema } from "@/modules/vaccination/schemas/vaccination-schema";

const validInput = {
  childId: "11111111-1111-4111-8111-111111111111",
  vaccineScheduleId: "22222222-2222-4222-8222-222222222222",
  applicationDate: "2026-08-25",
  notes: "",
};

describe("vaccination registration validation", () => {
  it("accepts a factual application on the Guatemala business date", () => {
    expect(
      createVaccinationInputSchema(
        new Date("2026-08-26T03:30:00.000Z"),
      ).safeParse(validInput).success,
    ).toBe(true);
  });

  it("rejects a future application date", () => {
    const result = createVaccinationInputSchema(
      new Date("2026-08-26T03:30:00.000Z"),
    ).safeParse({ ...validInput, applicationDate: "2026-08-26" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "La fecha de aplicación no puede estar en el futuro.",
      );
    }
  });
});
