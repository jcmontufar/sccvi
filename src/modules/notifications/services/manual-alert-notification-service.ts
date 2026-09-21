import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import { getAlert } from "@/modules/alerts/services/alert-service";
import { guardianIdSchema } from "@/modules/guardians/schemas/guardian-schema";
import {
  operationalAlertNotificationMessage,
  operationalAlertNotificationSubject,
} from "@/modules/notifications/services/alert-notification-content";
import {
  evaluateAlertNotificationGuardian,
  type NotificationRecipientIneligibility,
} from "@/modules/notifications/services/notification-recipient-policy";
import {
  deliverQueuedNotification,
  queueAlertNotification,
} from "@/modules/notifications/services/notification-service";
import {
  createNotificationProviderRegistry,
  type NotificationProviderSource,
} from "@/modules/notifications/services/provider-registry";

const guardianSelect = {
  id: true,
  fullName: true,
  email: true,
  isActive: true,
  preferredNotificationChannel: true,
  telegramConnection: {
    select: {
      chatId: true,
      linkedAt: true,
      consentedAt: true,
      revokedAt: true,
    },
  },
} as const;

export type ManualAlertNotificationRecipient = {
  guardianId: string;
  guardianName: string;
  preferredChannel: "EMAIL" | "TELEGRAM" | "WHATSAPP" | null;
  ineligibilityReason: NotificationRecipientIneligibility | null;
  notification: {
    status: "PENDING" | "SENT" | "FAILED";
    channel: "EMAIL" | "TELEGRAM" | "WHATSAPP";
    sentAt: Date | null;
    isClaimed: boolean;
  } | null;
  canSend: boolean;
};

function notificationResource(alert: Awaited<ReturnType<typeof getAlert>>) {
  return { healthCenterId: alert.child.community.healthCenterId };
}

export async function listManualAlertNotificationRecipients(
  user: ApplicationUser,
  alertId: string,
): Promise<ManualAlertNotificationRecipient[]> {
  const alert = await getAlert(user, alertId);
  authorize(user, "notification:create", notificationResource(alert));
  const relationships = await getPrisma().childGuardian.findMany({
    where: { childId: alert.childId },
    select: { guardian: { select: guardianSelect } },
    orderBy: { guardian: { fullName: "asc" } },
  });
  const guardianIds = relationships.map(({ guardian }) => guardian.id);
  const notifications = guardianIds.length
    ? await getPrisma().notification.findMany({
        where: { alertId: alert.id, guardianId: { in: guardianIds } },
        select: {
          guardianId: true,
          status: true,
          channel: true,
          sentAt: true,
          deliveryClaimedAt: true,
        },
      })
    : [];
  const notificationByGuardian = new Map(
    notifications.flatMap((notification) =>
      notification.guardianId
        ? [[notification.guardianId, notification] as const]
        : [],
    ),
  );

  return relationships.map(({ guardian }) => {
    const evaluation = evaluateAlertNotificationGuardian(alert.type, guardian);
    const existing = notificationByGuardian.get(guardian.id) ?? null;
    return {
      guardianId: guardian.id,
      guardianName: guardian.fullName,
      preferredChannel: guardian.preferredNotificationChannel,
      ineligibilityReason: evaluation.reason,
      notification: existing
        ? {
            status: existing.status,
            channel: existing.channel,
            sentAt: existing.sentAt,
            isClaimed: Boolean(existing.deliveryClaimedAt),
          }
        : null,
      canSend: Boolean(
        alert.status === "OPEN" &&
        evaluation.recipient &&
        (!existing ||
          (existing.status === "PENDING" && !existing.deliveryClaimedAt)),
      ),
    };
  });
}

export async function sendManualAlertNotification(
  user: ApplicationUser,
  alertId: string,
  guardianId: string,
  providerSource: NotificationProviderSource = createNotificationProviderRegistry(),
) {
  const alert = await getAlert(user, alertId);
  authorize(user, "notification:create", notificationResource(alert));
  if (alert.status !== "OPEN") {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Solo se pueden notificar alertas abiertas.",
    );
  }

  const guardian = await getPrisma().childGuardian.findFirst({
    where: {
      childId: alert.childId,
      guardianId: guardianIdSchema.parse(guardianId),
    },
    select: { guardian: { select: guardianSelect } },
  });
  if (!guardian) throw new ApplicationError("FORBIDDEN");

  const evaluation = evaluateAlertNotificationGuardian(
    alert.type,
    guardian.guardian,
  );
  if (!evaluation.recipient) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "El tutor no tiene un canal de notificación elegible para esta alerta.",
    );
  }

  const existing = await getPrisma().notification.findUnique({
    where: {
      alertId_guardianId: {
        alertId: alert.id,
        guardianId: guardian.guardian.id,
      },
    },
  });
  if (existing?.status === "SENT") {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Esta alerta ya fue notificada a este tutor.",
    );
  }
  if (existing?.status === "FAILED") {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "La entrega falló y no puede reintentarse de forma segura.",
    );
  }
  if (existing?.deliveryClaimedAt) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "La notificación ya está siendo procesada.",
    );
  }

  const notification =
    existing ??
    (await queueAlertNotification(user, {
      ...evaluation.recipient,
      alertId: alert.id,
      subject: operationalAlertNotificationSubject,
      message: operationalAlertNotificationMessage,
    }));
  return deliverQueuedNotification(user, notification.id, providerSource);
}
