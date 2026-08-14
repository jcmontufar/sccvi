import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import {
  deliveryResultToUpdate,
  type NotificationMessage,
  type NotificationProvider,
} from "@/modules/notifications/services/notification-delivery";

export async function queueEmailNotification(
  user: ApplicationUser,
  message: NotificationMessage & {
    guardianId?: string;
    alertId?: string;
    campaignRecipientId?: string;
  },
) {
  authorize(user, "notification:create");
  return getPrisma().notification.create({
    data: { ...message, channel: "EMAIL", status: "PENDING" },
  });
}

export async function deliverQueuedNotification(
  user: ApplicationUser,
  notificationId: string,
  provider: NotificationProvider,
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
  if (notification.status !== "PENDING") {
    throw new ApplicationError("VALIDATION_ERROR");
  }
  const result = await provider.deliver({
    destination: notification.destination,
    subject: notification.subject ?? undefined,
    message: notification.message,
  });
  return getPrisma().notification.update({
    where: { id: notification.id },
    data: deliveryResultToUpdate(result),
  });
}
