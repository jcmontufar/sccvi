import { describe, expect, it } from "vitest";

import { eligibleAlertEmailGuardians } from "@/modules/notifications/services/alert-email-policy";

const guardians = [
  {
    id: "email",
    email: "guardian@example.org",
    isActive: true,
    preferredNotificationChannel: "EMAIL" as const,
  },
  {
    id: "whatsapp",
    email: "other@example.org",
    isActive: true,
    preferredNotificationChannel: "WHATSAPP" as const,
  },
];

describe("operational alert email policy", () => {
  it("selects only active guardians who explicitly prefer email", () => {
    expect(eligibleAlertEmailGuardians("MISSED_FOLLOW_UP", guardians)).toEqual([
      guardians[0],
    ]);
  });

  it("does not email unapproved clinical alert categories", () => {
    expect(eligibleAlertEmailGuardians("GROWTH", guardians)).toEqual([]);
    expect(eligibleAlertEmailGuardians("VACCINATION", guardians)).toEqual([]);
  });

  it("deduplicates the same alert recipient", () => {
    expect(
      eligibleAlertEmailGuardians("MISSED_FOLLOW_UP", [
        guardians[0],
        guardians[0],
      ]),
    ).toHaveLength(1);
  });
});
