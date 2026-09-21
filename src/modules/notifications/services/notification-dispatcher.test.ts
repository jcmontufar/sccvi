import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NotificationProvider } from "@/modules/notifications/services/notification-delivery";
import type { ApplicationUser } from "@/modules/auth/types";

vi.mock("server-only", () => ({}));

const notification = {
  id: "notification-1",
  channel: "EMAIL",
  destination: "guardian@example.test",
  subject: "Aviso",
  message: "Seguimiento pendiente",
  status: "PENDING",
  deliveryClaimedAt: null,
};
const prisma = {
  notification: {
    upsert: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
};
vi.mock("@/lib/prisma", () => ({ getPrisma: () => prisma }));

import {
  dispatchPendingNotification,
  queueAlertNotification,
} from "@/modules/notifications/services/notification-service";

const admin: ApplicationUser = {
  id: "admin",
  authUserId: "auth-admin",
  healthCenterId: null,
  fullName: "Administración",
  email: "admin@example.test",
  role: "ADMIN",
  isActive: true,
};

describe("NotificationDispatcher", () => {
  const provider: NotificationProvider = {
    channel: "EMAIL",
    deliver: vi.fn().mockResolvedValue({
      delivered: true,
      providerMessageId: "provider-1",
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.notification.updateMany.mockResolvedValue({ count: 1 });
    prisma.notification.update.mockResolvedValue({
      ...notification,
      status: "SENT",
    });
  });

  it("claims atomically before delivery", async () => {
    await dispatchPendingNotification(notification, provider);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PENDING",
          deliveryClaimedAt: null,
        }),
      }),
    );
    expect(provider.deliver).toHaveBeenCalledTimes(1);
  });

  it("does not deliver when another worker already claimed it", async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 0 });
    prisma.notification.findUniqueOrThrow.mockResolvedValue({
      ...notification,
      deliveryClaimedAt: new Date(),
    });
    await dispatchPendingNotification(notification, provider);
    expect(provider.deliver).not.toHaveBeenCalled();
  });

  it("delivers only once when two requests race for the same notification", async () => {
    prisma.notification.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    prisma.notification.findUniqueOrThrow.mockResolvedValue({
      ...notification,
      deliveryClaimedAt: new Date(),
    });

    await Promise.all([
      dispatchPendingNotification(notification, provider),
      dispatchPendingNotification(notification, provider),
    ]);

    expect(provider.deliver).toHaveBeenCalledTimes(1);
  });

  it("rejects a provider for a different channel", async () => {
    await expect(
      dispatchPendingNotification(notification, {
        channel: "TELEGRAM",
        deliver: vi.fn(),
      }),
    ).rejects.toThrow("NOTIFICATION_PROVIDER_CHANNEL_MISMATCH");
  });

  it("upserts an alert notification by alert and guardian for idempotency", async () => {
    prisma.notification.upsert.mockResolvedValue(notification);

    await queueAlertNotification(admin, {
      alertId: "alert-1",
      guardianId: "guardian-1",
      channel: "EMAIL",
      destination: "guardian@example.test",
      subject: "Aviso",
      message: "Seguimiento pendiente",
    });

    expect(prisma.notification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          alertId_guardianId: {
            alertId: "alert-1",
            guardianId: "guardian-1",
          },
        },
        update: {},
      }),
    );
  });
});
