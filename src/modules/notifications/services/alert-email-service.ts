import "server-only";

import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import {
  createResendEmailProvider,
  unavailableEmailProvider,
} from "@/modules/notifications/providers/resend-email-provider";
import { eligibleAlertEmailGuardians } from "@/modules/notifications/services/alert-email-policy";
import type { NotificationProvider } from "@/modules/notifications/services/notification-delivery";
import { deliverQueuedNotification } from "@/modules/notifications/services/notification-service";

export async function sendOperationalAlertEmails(
  user: ApplicationUser,
  alertId: string,
  provider: NotificationProvider = createResendEmailProvider() ??
    unavailableEmailProvider,
) {
  const alert = await getPrisma().alert.findUniqueOrThrow({
    where: { id: alertId },
    include: {
      child: {
        include: {
          community: { select: { healthCenterId: true } },
          childGuardians: { include: { guardian: true } },
        },
      },
    },
  });
  authorize(user, "notification:create", {
    healthCenterId: alert.child.community.healthCenterId,
  });

  const recipients = eligibleAlertEmailGuardians(
    alert.type,
    alert.child.childGuardians.map(({ guardian }) => guardian),
  );
  const results = [];
  for (const guardian of recipients) {
    const destination = guardian.email?.trim();
    if (!destination) continue;
    const notification = await getPrisma().notification.upsert({
      where: {
        alertId_guardianId_channel: {
          alertId: alert.id,
          guardianId: guardian.id,
          channel: "EMAIL",
        },
      },
      update: {},
      create: {
        guardianId: guardian.id,
        alertId: alert.id,
        channel: "EMAIL",
        destination,
        subject: "Seguimiento infantil pendiente en SCCVI",
        message:
          "SCCVI registró un seguimiento pendiente. Comunícate con tu centro de salud para coordinar la evaluación correspondiente. Esta notificación no constituye un diagnóstico médico.",
        status: "PENDING",
      },
    });
    results.push(
      notification.status === "PENDING"
        ? await deliverQueuedNotification(user, notification.id, provider)
        : notification,
    );
  }
  return results;
}
