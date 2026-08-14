import { describe, expect, it } from "vitest";

import { createChildInputSchema } from "@/modules/children/schemas/child-schema";

const schema = createChildInputSchema(new Date("2026-08-15T03:30:00.000Z"));
const validChild = {
  communityId: "11111111-1111-4111-8111-111111111111",
  fullName: "Niño de prueba",
  sex: "MALE",
};

describe("child birth-date validation", () => {
  it("accepts Guatemala's current local calendar date", () => {
    expect(
      schema.safeParse({ ...validChild, dateOfBirth: "2026-08-14" }).success,
    ).toBe(true);
  });

  it("rejects the next UTC date while Guatemala is still on the previous date", () => {
    expect(
      schema.safeParse({ ...validChild, dateOfBirth: "2026-08-15" }).success,
    ).toBe(false);
  });
});
