import { describe, expect, it } from "vitest";

import { vaccineInputSchema } from "@/modules/vaccination/schemas/vaccine-schema";

describe("vaccine catalog validation", () => {
  it("accepts vaccine metadata without schedule information", () => {
    expect(
      vaccineInputSchema.safeParse({
        name: "Vacuna de prueba",
        description: "Definición administrativa sin dosis ni edades.",
      }).success,
    ).toBe(true);
  });

  it("rejects an empty vaccine name", () => {
    expect(
      vaccineInputSchema.safeParse({ name: " ", description: "" }).success,
    ).toBe(false);
  });
});
