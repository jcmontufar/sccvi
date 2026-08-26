import { describe, expect, it } from "vitest";

import type { ApplicationUser } from "@/modules/auth/types";
import { assertVaccinationRegistration } from "@/modules/vaccination/services/vaccination-registration";

const centerA = "11111111-1111-4111-8111-111111111111";
const baseUser: ApplicationUser = {
  id: "22222222-2222-4222-8222-222222222222",
  authUserId: "33333333-3333-4333-8333-333333333333",
  healthCenterId: centerA,
  fullName: "Personal autorizado",
  email: "personal@example.test",
  role: "HEALTH_STAFF",
  isActive: true,
};

function input(overrides: Record<string, unknown> = {}) {
  return {
    user: baseUser,
    child: {
      isActive: true,
      dateOfBirth: "2026-01-01",
      healthCenterId: centerA,
    },
    schedule: { isActive: true, hasApprovedVersion: true },
    applicationDate: "2026-03-01",
    duplicate: false,
    ...overrides,
  };
}

describe("vaccination registration rules", () => {
  it("accepts a valid factual registration", () => {
    expect(() => assertVaccinationRegistration(input())).not.toThrow();
  });

  it("prevents duplicate application of the same scheduled dose", () => {
    expect(() =>
      assertVaccinationRegistration(input({ duplicate: true })),
    ).toThrow("Esta dosis ya fue registrada para el niño.");
  });

  it("denies a guardian even for an associated child", () => {
    expect(() =>
      assertVaccinationRegistration(
        input({
          user: { ...baseUser, role: "GUARDIAN", healthCenterId: null },
          child: {
            isActive: true,
            dateOfBirth: "2026-01-01",
            healthCenterId: centerA,
            guardianUserIds: [baseUser.id],
          },
        }),
      ),
    ).toThrow("No tienes permiso");
  });

  it("denies cross-center child IDOR attempts", () => {
    expect(() =>
      assertVaccinationRegistration(
        input({
          child: {
            isActive: true,
            dateOfBirth: "2026-01-01",
            healthCenterId: "44444444-4444-4444-8444-444444444444",
          },
        }),
      ),
    ).toThrow("No tienes permiso");
  });

  it("rejects an application before the child's birth date", () => {
    expect(() =>
      assertVaccinationRegistration(input({ applicationDate: "2025-12-31" })),
    ).toThrow("anterior al nacimiento");
  });
});
