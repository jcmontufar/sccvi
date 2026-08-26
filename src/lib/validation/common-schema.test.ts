import { describe, expect, it } from "vitest";

import { activeStateSchema } from "@/lib/validation/common-schema";

describe("common server input validation", () => {
  it("accepts only actual boolean active-state values", () => {
    expect(activeStateSchema.safeParse(true).success).toBe(true);
    expect(activeStateSchema.safeParse(false).success).toBe(true);
    expect(activeStateSchema.safeParse("true").success).toBe(false);
    expect(activeStateSchema.safeParse(1).success).toBe(false);
  });
});
