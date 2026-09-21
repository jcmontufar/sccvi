import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApplicationUser } from "@/modules/auth/types";
import type { NotificationProvider } from "@/modules/notifications/services/notification-delivery";
import { ProviderRegistry } from "@/modules/notifications/services/provider-registry";

vi.mock("server-only", () => ({}));
const notification = {
  id: "notification-1",
  alertId: "alert-1",
  guardianId: "guardian-1",
  channel: "EMAIL" as const,
  destination: "guardian@example.test",
  subject: "Seguimiento",
  message: "Seguimiento pendiente",
  status: "PENDING" as "PENDING" | "SENT",
  deliveryClaimedAt: null,
};
const prisma = {
  alert: { findMany: vi.fn() },
  notification: {
    createMany: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
};
vi.mock("@/lib/prisma", () => ({ getPrisma: () => prisma }));

import { sendOperationalAlertEmailsForAlerts } from "@/modules/notifications/services/alert-email-service";

const admin: ApplicationUser = {
  id: "admin",
  authUserId: "auth-admin",
  healthCenterId: null,
  fullName: "Administración",
  email: "admin@example.test",
  role: "ADMIN",
  isActive: true,
};
const provider: NotificationProvider = {
  channel: "EMAIL",
  deliver: vi.fn().mockResolvedValue({
    delivered: true,
    providerMessageId: "provider-message",
  }),
};

describe("bulk operational alert email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notification.status = "PENDING";
    prisma.alert.findMany.mockResolvedValue([
      {
        id: "alert-1",
        type: "MISSED_FOLLOW_UP",
        child: {
          community: { healthCenterId: "center-a" },
          childGuardians: [
            {
              guardian: {
                id: "guardian-1",
                email: "guardian@example.test",
                isActive: true,
                preferredNotificationChannel: "EMAIL",
              },
            },
          ],
        },
      },
    ]);
    prisma.notification.findMany.mockImplementation(() =>
      Promise.resolve([{ ...notification }]),
    );
    prisma.notification.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...notification, ...data }),
    );
    prisma.notification.updateMany.mockResolvedValue({ count: 1 });
  });

  it("does not duplicate notifications or redeliver a sent notification", async () => {
    prisma.notification.createMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const first = await sendOperationalAlertEmailsForAlerts(
      admin,
      ["alert-1"],
      provider,
    );
    notification.status = "SENT";
    const repeated = await sendOperationalAlertEmailsForAlerts(
      admin,
      ["alert-1"],
      provider,
    );

    expect(first).toMatchObject({ created: 1, sent: 1 });
    expect(repeated).toMatchObject({ created: 0, existing: 1, sent: 0 });
    expect(provider.deliver).toHaveBeenCalledTimes(1);
    expect(prisma.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
  });

  it("dispatches a Telegram preference only through Telegram", async () => {
    const telegramProvider: NotificationProvider = {
      channel: "TELEGRAM",
      deliver: vi.fn().mockResolvedValue({
        delivered: true,
        providerMessageId: "telegram-message",
      }),
    };
    prisma.alert.findMany.mockResolvedValue([
      {
        id: "alert-1",
        type: "VACCINATION",
        child: {
          community: { healthCenterId: "center-a" },
          childGuardians: [
            {
              guardian: {
                id: "guardian-1",
                email: "guardian@example.test",
                isActive: true,
                preferredNotificationChannel: "TELEGRAM",
                telegramConnection: {
                  chatId: "12345",
                  linkedAt: new Date("2026-09-01T00:00:00Z"),
                  consentedAt: new Date("2026-09-01T00:00:00Z"),
                  revokedAt: null,
                },
              },
            },
          ],
        },
      },
    ]);
    prisma.notification.createMany.mockResolvedValue({ count: 1 });
    prisma.notification.findMany.mockResolvedValue([
      { ...notification, channel: "TELEGRAM", destination: "12345" },
    ]);
    const registry = new ProviderRegistry(
      new Map([
        ["EMAIL", provider],
        ["TELEGRAM", telegramProvider],
      ]),
    );

    const result = await sendOperationalAlertEmailsForAlerts(
      admin,
      ["alert-1"],
      registry,
    );

    expect(result.sent).toBe(1);
    expect(telegramProvider.deliver).toHaveBeenCalledTimes(1);
    expect(provider.deliver).not.toHaveBeenCalled();
  });
});
