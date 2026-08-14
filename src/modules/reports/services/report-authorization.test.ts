import { describe, expect, it } from "vitest";

import { can } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";

const staff: ApplicationUser = {
  id: "staff",
  authUserId: "auth",
  healthCenterId: "center-a",
  fullName: "Personal",
  email: "staff@example.test",
  role: "HEALTH_STAFF",
  isActive: true,
};
const guardian: ApplicationUser = {
  ...staff,
  id: "guardian",
  role: "GUARDIAN",
  healthCenterId: null,
};

describe("report authorization", () => {
  it("allows staff only within the assigned center", () => {
    expect(can(staff, "report:read", { healthCenterId: "center-a" })).toBe(
      true,
    );
    expect(can(staff, "report:read", { healthCenterId: "center-b" })).toBe(
      false,
    );
  });

  it("does not expose operational reports to guardians", () => {
    expect(can(guardian, "report:read")).toBe(false);
  });
});
