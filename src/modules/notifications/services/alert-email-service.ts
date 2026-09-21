import "server-only";

import { mapWithConcurrency } from "@/lib/async/map-with-concurrency";
import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import {
  operationalAlertNotificationMessage,
  operationalAlertNotificationSubject,
} from "@/modules/notifications/services/alert-notification-content";
import { eligibleAlertNotificationGuardians } from "@/modules/notifications/services/notification-recipient-policy";
import { dispatchPendingNotification } from "@/modules/notifications/services/notification-service";
import {
  asProviderRegistry,
  createNotificationProviderRegistry,
  type NotificationProviderSource,
} from "@/modules/notifications/services/provider-registry";

export type OperationalNotificationSummary = {
  eligibleRecipients: number;
  created: number;
  existing: number;
  sent: number;
  failed: number;
};

export async function sendOperationalAlertNotificationsForAlerts(
  user: ApplicationUser,
  alertIds: readonly string[],
  providerSource: NotificationProviderSource = createNotificationProviderRegistry(),
): Promise<OperationalNotificationSummary> {
  const registry = asProviderRegistry(providerSource);
  const uniqueAlertIds = [...new Set(alertIds)];
  if (!uniqueAlertIds.length) {
    return {
      eligibleRecipients: 0,
      created: 0,
      existing: 0,
      sent: 0,
      failed: 0,
    };
  }

  const alerts = await getPrisma().alert.findMany({
    where: { id: { in: uniqueAlertIds } },
    include: {
      child: {
        include: {
          community: { select: { healthCenterId: true } },
          childGuardians: {
            include: { guardian: { include: { telegramConnection: true } } },
          },
        },
      },
    },
  });
  const recipients = alerts.flatMap((alert) => {
    authorize(user, "notification:create", {
      healthCenterId: alert.child.community.healthCenterId,
    });
    return eligibleAlertNotificationGuardians(
      alert.type,
      alert.child.childGuardians.map(({ guardian }) => guardian),
    ).map((recipient) => ({ alertId: alert.id, ...recipient }));
  });
  const uniqueRecipients = [
    ...new Map(
      recipients.map((recipient) => [
        `${recipient.alertId}:${recipient.guardianId}:${recipient.channel}`,
        recipient,
      ]),
    ).values(),
  ];
  if (!uniqueRecipients.length) {
    return {
      eligibleRecipients: 0,
      created: 0,
      existing: 0,
      sent: 0,
      failed: 0,
    };
  }

  const created = await getPrisma().notification.createMany({
    data: uniqueRecipients.map((recipient) => ({
      ...recipient,
      subject: operationalAlertNotificationSubject,
      message: operationalAlertNotificationMessage,
      status: "PENDING" as const,
    })),
    skipDuplicates: true,
  });
  const expectedPairs = new Set(
    uniqueRecipients.map(
      ({ alertId, guardianId, channel }) =>
        `${alertId}:${guardianId}:${channel}`,
    ),
  );
  const notifications = (
    await getPrisma().notification.findMany({
      where: {
        alertId: { in: uniqueAlertIds },
        guardianId: {
          in: uniqueRecipients.map(({ guardianId }) => guardianId),
        },
        channel: { in: ["EMAIL", "TELEGRAM"] },
      },
    })
  ).filter(
    (notification) =>
      notification.alertId &&
      notification.guardianId &&
      expectedPairs.has(
        `${notification.alertId}:${notification.guardianId}:${notification.channel}`,
      ),
  );
  const pending = notifications.filter(({ status }) => status === "PENDING");
  const deliveryResults = await mapWithConcurrency(
    pending,
    4,
    async (notification) => {
      return dispatchPendingNotification(notification, registry);
    },
  );

  return {
    eligibleRecipients: uniqueRecipients.length,
    created: created.count,
    existing: uniqueRecipients.length - created.count,
    sent: deliveryResults.filter(({ status }) => status === "SENT").length,
    failed: deliveryResults.filter(({ status }) => status === "FAILED").length,
  };
}

export async function sendOperationalAlertNotifications(
  user: ApplicationUser,
  alertId: string,
  providerSource: NotificationProviderSource = createNotificationProviderRegistry(),
) {
  const summary = await sendOperationalAlertNotificationsForAlerts(
    user,
    [alertId],
    providerSource,
  );
  return summary;
}

export const sendOperationalAlertEmailsForAlerts =
  sendOperationalAlertNotificationsForAlerts;
export const sendOperationalAlertEmails = sendOperationalAlertNotifications;
export type OperationalEmailSummary = OperationalNotificationSummary;
