import type { DeliverableNotificationChannel } from "@/modules/notifications/services/notification-delivery";

type GuardianRecipient = {
  id: string;
  email: string | null;
  isActive: boolean;
  preferredNotificationChannel: "EMAIL" | "TELEGRAM" | "WHATSAPP" | null;
  telegramConnection?: {
    chatId: string | null;
    linkedAt: Date | null;
    consentedAt: Date | null;
    revokedAt: Date | null;
  } | null;
};

export type NotificationRecipientIneligibility =
  | "ALERT_TYPE_UNSUPPORTED"
  | "GUARDIAN_INACTIVE"
  | "CHANNEL_NOT_SELECTED"
  | "EMAIL_UNAVAILABLE"
  | "TELEGRAM_UNAVAILABLE"
  | "CHANNEL_UNSUPPORTED";

export type NotificationRecipientEvaluation =
  | { recipient: NotificationRecipient; reason: null }
  | { recipient: null; reason: NotificationRecipientIneligibility };

export type NotificationRecipient = {
  guardianId: string;
  channel: DeliverableNotificationChannel;
  destination: string;
};

export function selectGuardianNotificationRecipient(
  guardian: GuardianRecipient,
): NotificationRecipient | null {
  return evaluateGuardianNotificationRecipient(guardian).recipient;
}

export function evaluateGuardianNotificationRecipient(
  guardian: GuardianRecipient,
): NotificationRecipientEvaluation {
  if (!guardian.isActive) {
    return { recipient: null, reason: "GUARDIAN_INACTIVE" };
  }
  if (guardian.preferredNotificationChannel === "EMAIL") {
    const destination = guardian.email?.trim();
    return destination
      ? {
          recipient: {
            guardianId: guardian.id,
            channel: "EMAIL",
            destination,
          },
          reason: null,
        }
      : { recipient: null, reason: "EMAIL_UNAVAILABLE" };
  }
  if (guardian.preferredNotificationChannel === "TELEGRAM") {
    const connection = guardian.telegramConnection;
    return connection?.chatId &&
      connection.linkedAt &&
      connection.consentedAt &&
      !connection.revokedAt
      ? {
          recipient: {
            guardianId: guardian.id,
            channel: "TELEGRAM",
            destination: connection.chatId,
          },
          reason: null,
        }
      : { recipient: null, reason: "TELEGRAM_UNAVAILABLE" };
  }
  return {
    recipient: null,
    reason: guardian.preferredNotificationChannel
      ? "CHANNEL_UNSUPPORTED"
      : "CHANNEL_NOT_SELECTED",
  };
}

export function evaluateAlertNotificationGuardian(
  alertType: "GROWTH" | "VACCINATION" | "MISSED_FOLLOW_UP",
  guardian: GuardianRecipient,
): NotificationRecipientEvaluation {
  if (alertType !== "MISSED_FOLLOW_UP" && alertType !== "VACCINATION") {
    return { recipient: null, reason: "ALERT_TYPE_UNSUPPORTED" };
  }
  return evaluateGuardianNotificationRecipient(guardian);
}

export function eligibleAlertNotificationGuardians(
  alertType: "GROWTH" | "VACCINATION" | "MISSED_FOLLOW_UP",
  guardians: readonly GuardianRecipient[],
) {
  const seen = new Set<string>();
  return guardians.flatMap((guardian) => {
    if (seen.has(guardian.id)) return [];
    seen.add(guardian.id);
    const recipient = evaluateAlertNotificationGuardian(
      alertType,
      guardian,
    ).recipient;
    return recipient ? [recipient] : [];
  });
}
