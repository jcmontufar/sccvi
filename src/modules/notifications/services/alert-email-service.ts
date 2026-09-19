import "server-only";

import { mapWithConcurrency } from "@/lib/async/map-with-concurrency";
import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import {
  createResendEmailProvider,
  unavailableEmailProvider,
} from "@/modules/notifications/providers/resend-email-provider";
import { eligibleAlertEmailGuardians } from "@/modules/notifications/services/alert-email-policy";
import type { NotificationProvider } from "@/modules/notifications/services/notification-delivery";
import { deliveryResultToUpdate } from "@/modules/notifications/services/notification-delivery";

export type OperationalEmailSummary = {
  eligibleRecipients: number;
  created: number;
  existing: number;
  sent: number;
  failed: number;
};

const notificationSubject = "Seguimiento infantil pendiente en SCCVI";
const notificationMessage =
  "SCCVI registró un seguimiento pendiente. Comunícate con tu centro de salud para coordinar la evaluación correspondiente. Esta notificación no constituye un diagnóstico médico.";

export async function sendOperationalAlertEmailsForAlerts(
  user: ApplicationUser,
  alertIds: readonly string[],
  provider: NotificationProvider = createResendEmailProvider() ??
    unavailableEmailProvider,
): Promise<OperationalEmailSummary> {
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
          childGuardians: { include: { guardian: true } },
        },
      },
    },
  });
  const recipients = alerts.flatMap((alert) => {
    authorize(user, "notification:create", {
      healthCenterId: alert.child.community.healthCenterId,
    });
    return eligibleAlertEmailGuardians(
      alert.type,
      alert.child.childGuardians.map(({ guardian }) => guardian),
    ).flatMap((guardian) => {
      const destination = guardian.email?.trim();
      return destination
        ? [{ alertId: alert.id, guardianId: guardian.id, destination }]
        : [];
    });
  });
  const uniqueRecipients = [
    ...new Map(
      recipients.map((recipient) => [
        `${recipient.alertId}:${recipient.guardianId}`,
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
      channel: "EMAIL" as const,
      subject: notificationSubject,
      message: notificationMessage,
      status: "PENDING" as const,
    })),
    skipDuplicates: true,
  });
  const expectedPairs = new Set(
    uniqueRecipients.map(
      ({ alertId, guardianId }) => `${alertId}:${guardianId}`,
    ),
  );
  const notifications = (
    await getPrisma().notification.findMany({
      where: {
        alertId: { in: uniqueAlertIds },
        guardianId: {
          in: uniqueRecipients.map(({ guardianId }) => guardianId),
        },
        channel: "EMAIL",
      },
    })
  ).filter(
    (notification) =>
      notification.alertId &&
      notification.guardianId &&
      expectedPairs.has(`${notification.alertId}:${notification.guardianId}`),
  );
  const pending = notifications.filter(({ status }) => status === "PENDING");
  const deliveryResults = await mapWithConcurrency(
    pending,
    4,
    async (notification) => {
      const result = await provider.deliver({
        destination: notification.destination,
        subject: notification.subject ?? undefined,
        message: notification.message,
        idempotencyKey: `notification/${notification.id}`,
      });
      await getPrisma().notification.update({
        where: { id: notification.id },
        data: deliveryResultToUpdate(result),
      });
      return result;
    },
  );

  return {
    eligibleRecipients: uniqueRecipients.length,
    created: created.count,
    existing: uniqueRecipients.length - created.count,
    sent: deliveryResults.filter(({ delivered }) => delivered).length,
    failed: deliveryResults.filter(({ delivered }) => !delivered).length,
  };
}

export async function sendOperationalAlertEmails(
  user: ApplicationUser,
  alertId: string,
  provider: NotificationProvider = createResendEmailProvider() ??
    unavailableEmailProvider,
) {
  const summary = await sendOperationalAlertEmailsForAlerts(
    user,
    [alertId],
    provider,
  );
  return summary;
}
