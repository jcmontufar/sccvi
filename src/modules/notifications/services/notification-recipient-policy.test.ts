import { describe, expect, it } from "vitest";

import {
  eligibleAlertNotificationGuardians,
  selectGuardianNotificationRecipient,
} from "@/modules/notifications/services/notification-recipient-policy";

const guardian = {
  id: "guardian-1",
  email: "guardian@example.test",
  isActive: true,
  preferredNotificationChannel: "EMAIL" as const,
  telegramConnection: {
    chatId: "12345",
    linkedAt: new Date("2026-09-01T00:00:00Z"),
    consentedAt: new Date("2026-09-01T00:00:00Z"),
    revokedAt: null,
  },
};

describe("notification recipient policy", () => {
  it("selects exactly the preferred provider", () => {
    expect(selectGuardianNotificationRecipient(guardian)).toMatchObject({
      channel: "EMAIL",
      destination: "guardian@example.test",
    });
    expect(
      selectGuardianNotificationRecipient({
        ...guardian,
        preferredNotificationChannel: "TELEGRAM",
      }),
    ).toMatchObject({ channel: "TELEGRAM", destination: "12345" });
  });

  it("does not select Telegram without a valid verified connection", () => {
    expect(
      selectGuardianNotificationRecipient({
        ...guardian,
        preferredNotificationChannel: "TELEGRAM",
        telegramConnection: null,
      }),
    ).toBeNull();
    expect(
      selectGuardianNotificationRecipient({
        ...guardian,
        preferredNotificationChannel: "TELEGRAM",
        telegramConnection: {
          chatId: null,
          linkedAt: null,
          consentedAt: null,
          revokedAt: new Date(),
        },
      }),
    ).toBeNull();
    expect(
      selectGuardianNotificationRecipient({
        ...guardian,
        preferredNotificationChannel: "TELEGRAM",
        telegramConnection: {
          chatId: "12345",
          linkedAt: new Date(),
          consentedAt: null,
          revokedAt: null,
        },
      }),
    ).toBeNull();
  });

  it("allows only operational vaccination and follow-up alerts", () => {
    expect(eligibleAlertNotificationGuardians("GROWTH", [guardian])).toEqual(
      [],
    );
    expect(
      eligibleAlertNotificationGuardians("VACCINATION", [guardian]),
    ).toHaveLength(1);
  });
});
