import { describe, expect, it } from "vitest";

import { shouldCreateMissedFollowUpAlert } from "@/modules/alerts/services/missed-follow-up-rule";
import { can } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";

const currentInstant = new Date("2026-08-14T12:00:00.000Z");

describe("missed growth follow-up rule", () => {
  const user = (role: ApplicationUser["role"]): ApplicationUser => ({
    id: "11111111-1111-4111-8111-111111111111",
    authUserId: "22222222-2222-4222-8222-222222222222",
    healthCenterId: "33333333-3333-4333-8333-333333333333",
    fullName: "Usuario de prueba",
    email: "usuario@example.test",
    role,
    isActive: true,
  });

  it("allows operational roles and denies guardians from generating alerts", () => {
    expect(can(user("HEALTH_STAFF"), "alert:review")).toBe(true);
    expect(can(user("CENTER_MANAGER"), "alert:review")).toBe(true);
    expect(can(user("GUARDIAN"), "alert:review")).toBe(false);
  });
  it("does nothing when staff did not schedule a follow-up", () => {
    expect(shouldCreateMissedFollowUpAlert({}, currentInstant)).toBe(false);
  });

  it("does not alert before or on the scheduled date", () => {
    expect(
      shouldCreateMissedFollowUpAlert(
        { dueDate: "2026-08-15" },
        currentInstant,
      ),
    ).toBe(false);
    expect(
      shouldCreateMissedFollowUpAlert(
        { dueDate: "2026-08-14" },
        currentInstant,
      ),
    ).toBe(false);
  });

  it("alerts after the scheduled date with no grace period", () => {
    expect(
      shouldCreateMissedFollowUpAlert(
        { dueDate: "2026-08-13" },
        currentInstant,
      ),
    ).toBe(true);
  });

  it("does not alert after a qualifying follow-up was completed", () => {
    expect(
      shouldCreateMissedFollowUpAlert(
        { dueDate: "2026-08-13", completedAt: new Date() },
        currentInstant,
      ),
    ).toBe(false);
  });

  it("uses the Guatemala business date at the UTC boundary", () => {
    expect(
      shouldCreateMissedFollowUpAlert(
        { dueDate: "2026-08-14" },
        new Date("2026-08-15T03:30:00.000Z"),
      ),
    ).toBe(false);
  });
});
