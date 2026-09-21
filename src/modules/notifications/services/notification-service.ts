import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import {
  deliveryResultToUpdate,
  type DeliverableNotificationChannel,
  type NotificationMessage,
} from "@/modules/notifications/services/notification-delivery";
import {
  asProviderRegistry,
  createNotificationProviderRegistry,
  type NotificationProviderSource,
} from "@/modules/notifications/services/provider-registry";

type PendingNotification = {
  id: string;
  channel: string;
  destination: string;
  subject: string | null;
  message: string;
  status: string;
  deliveryClaimedAt: Date | null;
};

function deliverableChannel(channel: string): DeliverableNotificationChannel {
  if (channel !== "EMAIL" && channel !== "TELEGRAM") {
    throw new ApplicationError("VALIDATION_ERROR");
  }
  return channel;
}

export async function queueNotification(
  user: ApplicationUser,
  message: NotificationMessage & {
    channel: DeliverableNotificationChannel;
    guardianId?: string;
    alertId?: string;
    campaignRecipientId?: string;
  },
) {
  authorize(user, "notification:create");
  return getPrisma().notification.create({
    data: {
      destination: message.destination,
      subject: message.subject,
      message: message.message,
      guardianId: message.guardianId,
      alertId: message.alertId,
      campaignRecipientId: message.campaignRecipientId,
      channel: message.channel,
      status: "PENDING",
    },
  });
}

export async function queueEmailNotification(
  user: ApplicationUser,
  message: NotificationMessage & {
    guardianId?: string;
    alertId?: string;
    campaignRecipientId?: string;
  },
) {
  return queueNotification(user, { ...message, channel: "EMAIL" });
}

export async function queueAlertNotification(
  user: ApplicationUser,
  message: NotificationMessage & {
    channel: DeliverableNotificationChannel;
    guardianId: string;
    alertId: string;
  },
) {
  authorize(user, "notification:create");
  return getPrisma().notification.upsert({
    where: {
      alertId_guardianId: {
        alertId: message.alertId,
        guardianId: message.guardianId,
      },
    },
    update: {},
    create: {
      destination: message.destination,
      subject: message.subject,
      message: message.message,
      guardianId: message.guardianId,
      alertId: message.alertId,
      channel: message.channel,
      status: "PENDING",
    },
  });
}

export async function dispatchPendingNotification(
  notification: PendingNotification,
  providerSource: NotificationProviderSource = createNotificationProviderRegistry(),
) {
  const registry = asProviderRegistry(providerSource);
  if (notification.status !== "PENDING" || notification.deliveryClaimedAt) {
    return getPrisma().notification.findUniqueOrThrow({
      where: { id: notification.id },
    });
  }
  const channel = deliverableChannel(notification.channel);
  const provider = registry.get(channel);
  if (provider.channel !== channel) {
    throw new Error("NOTIFICATION_PROVIDER_CHANNEL_MISMATCH");
  }
  const claimedAt = new Date();
  const claim = await getPrisma().notification.updateMany({
    where: {
      id: notification.id,
      status: "PENDING",
      deliveryClaimedAt: null,
    },
    data: { deliveryClaimedAt: claimedAt },
  });
  if (claim.count !== 1) {
    return getPrisma().notification.findUniqueOrThrow({
      where: { id: notification.id },
    });
  }
  const result = await provider.deliver({
    destination: notification.destination,
    subject: notification.subject ?? undefined,
    message: notification.message,
    idempotencyKey: `notification/${notification.id}`,
  });
  return getPrisma().notification.update({
    where: { id: notification.id },
    data: deliveryResultToUpdate(result),
  });
}

export async function deliverQueuedNotification(
  user: ApplicationUser,
  notificationId: string,
  providerSource: NotificationProviderSource = createNotificationProviderRegistry(),
) {
  authorize(user, "notification:create");
  const notification = await getPrisma().notification.findUniqueOrThrow({
    where: { id: notificationId },
    include: {
      guardian: {
        include: { community: { select: { healthCenterId: true } } },
      },
      alert: {
        include: {
          child: {
            include: { community: { select: { healthCenterId: true } } },
          },
        },
      },
      campaignRecipient: {
        include: {
          campaign: {
            include: { createdBy: { select: { healthCenterId: true } } },
          },
        },
      },
    },
  });
  const healthCenterId =
    notification.guardian?.community.healthCenterId ??
    notification.alert?.child.community.healthCenterId ??
    notification.campaignRecipient?.campaign.createdBy.healthCenterId;
  authorize(user, "notification:create", { healthCenterId });
  return dispatchPendingNotification(notification, providerSource);
}
