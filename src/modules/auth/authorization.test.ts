import { describe, expect, it } from "vitest";

import { ApplicationError } from "@/lib/errors/application-error";
import { authorize, can } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";

const centerA = "11111111-1111-4111-8111-111111111111";
const centerB = "22222222-2222-4222-8222-222222222222";

function user(
  role: ApplicationUser["role"],
  healthCenterId: string | null = centerA,
): ApplicationUser {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    authUserId: "44444444-4444-4444-8444-444444444444",
    healthCenterId,
    fullName: "Usuario de prueba",
    email: "usuario@example.test",
    role,
    isActive: true,
  };
}

describe("authorization", () => {
  it("allows an administrator to manage any center", () => {
    expect(
      can(user("ADMIN", null), "community:update", { healthCenterId: centerB }),
    ).toBe(true);
  });

  it("allows a center manager to manage its assigned center", () => {
    expect(
      can(user("CENTER_MANAGER"), "community:create", {
        healthCenterId: centerA,
      }),
    ).toBe(true);
  });

  it("denies cross-center access to a center manager", () => {
    expect(() =>
      authorize(user("CENTER_MANAGER"), "community:update", {
        healthCenterId: centerB,
      }),
    ).toThrowError(ApplicationError);
  });

  it("keeps health staff read-only for communities", () => {
    expect(
      can(user("HEALTH_STAFF"), "community:read", { healthCenterId: centerA }),
    ).toBe(true);
    expect(
      can(user("HEALTH_STAFF"), "community:create", {
        healthCenterId: centerA,
      }),
    ).toBe(false);
  });

  it("denies organizational access to guardians", () => {
    expect(can(user("GUARDIAN"), "community:list")).toBe(false);
  });

  it("denies every action to inactive users", () => {
    expect(
      can({ ...user("ADMIN"), isActive: false }, "health-center:list"),
    ).toBe(false);
  });

  it.each([
    "health-center:read",
    "community:read",
    "guardian:read",
    "child:read",
    "growth:list",
    "growth:create",
    "vaccination:list",
    "vaccination:create",
    "alert:read",
    "alert:resolve",
    "notification:create",
    "campaign:read",
    "qr:manage",
    "report:read",
  ] as const)("denies cross-center access for %s", (action) => {
    expect(can(user("HEALTH_STAFF"), action, { healthCenterId: centerB })).toBe(
      false,
    );
  });

  it("keeps center managers operationally read-only for clinical records", () => {
    const manager = user("CENTER_MANAGER");
    const resource = { healthCenterId: centerA };
    expect(can(manager, "child:read", resource)).toBe(true);
    expect(can(manager, "child:create", resource)).toBe(false);
    expect(can(manager, "growth:list", resource)).toBe(true);
    expect(can(manager, "growth:create", resource)).toBe(false);
    expect(can(manager, "vaccination:list", resource)).toBe(true);
    expect(can(manager, "vaccination:create", resource)).toBe(false);
    expect(can(manager, "qr:manage", resource)).toBe(false);
  });

  it("allows guardians only associated read paths", () => {
    const guardian = user("GUARDIAN", null);
    const associated = { guardianUserIds: [guardian.id] };
    expect(can(guardian, "child:read", associated)).toBe(true);
    expect(can(guardian, "growth:list", associated)).toBe(true);
    expect(can(guardian, "vaccination:list", associated)).toBe(true);
    expect(can(guardian, "alert:read", associated)).toBe(true);
    expect(can(guardian, "dashboard:read", associated)).toBe(true);
    expect(can(guardian, "report:read", associated)).toBe(false);
    expect(can(guardian, "qr:manage", associated)).toBe(false);
  });
});
