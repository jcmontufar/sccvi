import { describe, expect, it } from "vitest";

import { validateChildGuardianAssociation } from "@/modules/children/services/child-guardian-rules";

describe("child-guardian association rules", () => {
  it("allows a new same-center relationship", () => {
    expect(() =>
      validateChildGuardianAssociation({
        duplicate: false,
        childHealthCenterId: "center-a",
        guardianHealthCenterId: "center-a",
      }),
    ).not.toThrow();
  });

  it("rejects a duplicate relationship", () => {
    expect(() =>
      validateChildGuardianAssociation({
        duplicate: true,
        childHealthCenterId: "center-a",
        guardianHealthCenterId: "center-a",
      }),
    ).toThrowError(
      expect.objectContaining({ code: "CHILD_GUARDIAN_DUPLICATE" }),
    );
  });

  it("rejects a cross-center relationship", () => {
    expect(() =>
      validateChildGuardianAssociation({
        duplicate: false,
        childHealthCenterId: "center-a",
        guardianHealthCenterId: "center-b",
      }),
    ).toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));
  });
});
