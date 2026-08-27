import { describe, expect, it } from "vitest";

import { can } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";

const manager: ApplicationUser = {
  id: "manager",
  authUserId: "auth",
  healthCenterId: "center-a",
  fullName: "Gerente",
  email: "manager@example.test",
  role: "CENTER_MANAGER",
  isActive: true,
};

describe("campaign center scope", () => {
  it("allows a manager inside the assigned center", () => {
    expect(
      can(manager, "campaign:create", { healthCenterId: "center-a" }),
    ).toBe(true);
    expect(can(manager, "campaign:send", { healthCenterId: "center-a" })).toBe(
      true,
    );
  });

  it("denies cross-center campaign access", () => {
    expect(can(manager, "campaign:read", { healthCenterId: "center-b" })).toBe(
      false,
    );
    expect(can(manager, "campaign:send", { healthCenterId: "center-b" })).toBe(
      false,
    );
  });
});
