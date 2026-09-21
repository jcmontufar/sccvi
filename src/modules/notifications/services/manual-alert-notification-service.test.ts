import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApplicationUser } from "@/modules/auth/types";
import type { NotificationProvider } from "@/modules/notifications/services/notification-delivery";

vi.mock("server-only", () => ({}));

const alertId = "11111111-1111-4111-8111-111111111111";
const guardianId = "22222222-2222-4222-8222-222222222222";
const alert = {
  id: alertId,
  childId: "33333333-3333-4333-8333-333333333333",
  type: "VACCINATION" as const,
  status: "OPEN" as const,
  child: { community: { healthCenterId: "center-a" } },
};
const guardian = {
  id: guardianId,
  fullName: "Tutora Ficticia",
  email: "tutora@example.test",
  isActive: true,
  preferredNotificationChannel: "EMAIL" as const,
  telegramConnection: null,
};
const prisma = {
  childGuardian: { findFirst: vi.fn(), findMany: vi.fn() },
  notification: { findUnique: vi.fn(), findMany: vi.fn() },
};
const { queueAlertNotification, deliverQueuedNotification } = vi.hoisted(
  () => ({
    queueAlertNotification: vi.fn(),
    deliverQueuedNotification: vi.fn(),
  }),
);

vi.mock("@/lib/prisma", () => ({ getPrisma: () => prisma }));
vi.mock("@/modules/alerts/services/alert-service", () => ({
  getAlert: vi.fn(() => Promise.resolve(alert)),
}));
vi.mock("@/modules/notifications/services/notification-service", () => ({
  queueAlertNotification,
  deliverQueuedNotification,
}));

import { sendManualAlertNotification } from "@/modules/notifications/services/manual-alert-notification-service";

const staff: ApplicationUser = {
  id: "staff",
  authUserId: "auth-staff",
  healthCenterId: "center-a",
  fullName: "Personal de salud",
  email: "staff@example.test",
  role: "HEALTH_STAFF",
  isActive: true,
};
const emailProvider: NotificationProvider = {
  channel: "EMAIL",
  deliver: vi.fn(),
};

describe("manual alert notification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.childGuardian.findFirst.mockResolvedValue({ guardian });
    prisma.notification.findUnique.mockResolvedValue(null);
    queueAlertNotification.mockResolvedValue({
      id: "notification-1",
      status: "PENDING",
      deliveryClaimedAt: null,
    });
    deliverQueuedNotification.mockResolvedValue({
      id: "notification-1",
      status: "SENT",
    });
  });

  it("sends one EMAIL notification for the selected associated guardian", async () => {
    const result = await sendManualAlertNotification(
      staff,
      alertId,
      guardianId,
      emailProvider,
    );

    expect(result.status).toBe("SENT");
    expect(queueAlertNotification).toHaveBeenCalledWith(
      staff,
      expect.objectContaining({
        alertId,
        guardianId,
        channel: "EMAIL",
        destination: "tutora@example.test",
      }),
    );
    expect(deliverQueuedNotification).toHaveBeenCalledWith(
      staff,
      "notification-1",
      emailProvider,
    );
  });

  it("selects TELEGRAM only when the selected guardian has a consented link", async () => {
    prisma.childGuardian.findFirst.mockResolvedValue({
      guardian: {
        ...guardian,
        preferredNotificationChannel: "TELEGRAM",
        telegramConnection: {
          chatId: "12345",
          linkedAt: new Date("2026-09-01T00:00:00Z"),
          consentedAt: new Date("2026-09-01T00:00:00Z"),
          revokedAt: null,
        },
      },
    });

    await sendManualAlertNotification(staff, alertId, guardianId, {
      channel: "TELEGRAM",
      deliver: vi.fn(),
    });

    expect(queueAlertNotification).toHaveBeenCalledWith(
      staff,
      expect.objectContaining({ channel: "TELEGRAM", destination: "12345" }),
    );
  });

  it("rejects a guardian who is not associated with the alert child", async () => {
    prisma.childGuardian.findFirst.mockResolvedValue(null);
    await expect(
      sendManualAlertNotification(staff, alertId, guardianId, emailProvider),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(queueAlertNotification).not.toHaveBeenCalled();
  });

  it("rejects cross-center access", async () => {
    await expect(
      sendManualAlertNotification(
        { ...staff, healthCenterId: "center-b" },
        alertId,
        guardianId,
        emailProvider,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a preferred channel without an eligible destination", async () => {
    prisma.childGuardian.findFirst.mockResolvedValue({
      guardian: { ...guardian, email: null },
    });
    await expect(
      sendManualAlertNotification(staff, alertId, guardianId, emailProvider),
    ).rejects.toThrow("canal de notificación elegible");
    expect(queueAlertNotification).not.toHaveBeenCalled();
  });

  it.each(["SENT", "FAILED"] as const)(
    "does not deliver an existing %s notification",
    async (status) => {
      prisma.notification.findUnique.mockResolvedValue({
        id: "notification-1",
        status,
        deliveryClaimedAt: new Date(),
      });
      await expect(
        sendManualAlertNotification(staff, alertId, guardianId, emailProvider),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
      expect(deliverQueuedNotification).not.toHaveBeenCalled();
    },
  );

  it("rejects a role without notification authorization", async () => {
    await expect(
      sendManualAlertNotification(
        { ...staff, role: "GUARDIAN" },
        alertId,
        guardianId,
        emailProvider,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
