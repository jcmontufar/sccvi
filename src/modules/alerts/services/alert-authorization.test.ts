import { describe, expect, it } from "vitest";

import { can } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";

const guardian: ApplicationUser = {
  id: "guardian-user",
  authUserId: "auth-guardian",
  healthCenterId: null,
  fullName: "Tutor",
  email: "tutor@example.test",
  role: "GUARDIAN",
  isActive: true,
};

describe("alert authorization", () => {
  it("allows a guardian to read an associated child's alert", () => {
    expect(
      can(guardian, "alert:read", { guardianUserIds: [guardian.id] }),
    ).toBe(true);
  });

  it("denies unrelated alerts and all alert transitions to guardians", () => {
    expect(
      can(guardian, "alert:read", { guardianUserIds: ["another-user"] }),
    ).toBe(false);
    expect(
      can(guardian, "alert:review", { guardianUserIds: [guardian.id] }),
    ).toBe(false);
    expect(
      can(guardian, "alert:resolve", { guardianUserIds: [guardian.id] }),
    ).toBe(false);
  });
});
