import { describe, expect, it } from "vitest";

import { can } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";

const centerA = "11111111-1111-4111-8111-111111111111";
const centerB = "22222222-2222-4222-8222-222222222222";

function user(
  role: ApplicationUser["role"],
  id = "guardian-user",
  healthCenterId: string | null = centerA,
): ApplicationUser {
  return {
    id,
    authUserId: "auth-id",
    healthCenterId,
    fullName: "Usuario",
    email: "user@example.test",
    role,
    isActive: true,
  };
}

describe("child and growth resource authorization", () => {
  it("allows an associated guardian to read a child and growth history", () => {
    const guardian = user("GUARDIAN");
    const resource = {
      healthCenterId: centerA,
      guardianUserIds: [guardian.id],
    };
    expect(can(guardian, "child:read", resource)).toBe(true);
    expect(can(guardian, "growth:list", resource)).toBe(true);
  });

  it("denies an unrelated guardian even with a manually changed child ID", () => {
    const guardian = user("GUARDIAN");
    const unrelatedResource = {
      healthCenterId: centerA,
      guardianUserIds: ["different-user"],
    };
    expect(can(guardian, "child:read", unrelatedResource)).toBe(false);
    expect(can(guardian, "growth:list", unrelatedResource)).toBe(false);
  });

  it("denies inactive guardian access", () => {
    const guardian = { ...user("GUARDIAN"), isActive: false };
    expect(
      can(guardian, "child:read", { guardianUserIds: [guardian.id] }),
    ).toBe(false);
  });

  it("denies cross-center health staff access", () => {
    const staff = user("HEALTH_STAFF");
    expect(can(staff, "child:read", { healthCenterId: centerB })).toBe(false);
    expect(can(staff, "growth:create", { healthCenterId: centerB })).toBe(
      false,
    );
  });

  it("keeps guardians read-only for measurements", () => {
    const guardian = user("GUARDIAN");
    const resource = { guardianUserIds: [guardian.id] };
    expect(can(guardian, "growth:create", resource)).toBe(false);
    expect(can(guardian, "growth:update", resource)).toBe(false);
  });
});
