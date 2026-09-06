import { describe, expect, it } from "vitest";

import { alertSearchSchema } from "@/modules/alerts/schemas/alert-schema";

describe("alert search schema", () => {
  it("accepts the existing alert types as filters", () => {
    expect(
      alertSearchSchema.parse({
        status: "OPEN",
        severity: "ALL",
        type: "VACCINATION",
      }),
    ).toEqual({
      status: "OPEN",
      severity: "ALL",
      type: "VACCINATION",
    });
  });

  it("defaults to all types and rejects unknown categories", () => {
    expect(alertSearchSchema.parse({})).toMatchObject({ type: "ALL" });
    expect(alertSearchSchema.safeParse({ type: "UNKNOWN" }).success).toBe(
      false,
    );
  });
});
