import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NotificationProvider } from "@/modules/notifications/services/notification-delivery";

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
    updateMany: vi.fn(),
    update: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
};
vi.mock("@/lib/prisma", () => ({ getPrisma: () => prisma }));

import { dispatchPendingNotification } from "@/modules/notifications/services/notification-service";

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

  it("rejects a provider for a different channel", async () => {
    await expect(
      dispatchPendingNotification(notification, {
        channel: "TELEGRAM",
        deliver: vi.fn(),
      }),
    ).rejects.toThrow("NOTIFICATION_PROVIDER_CHANNEL_MISMATCH");
  });
});
