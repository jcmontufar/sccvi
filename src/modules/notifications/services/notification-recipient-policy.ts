import type { DeliverableNotificationChannel } from "@/modules/notifications/services/notification-delivery";

type GuardianRecipient = {
  id: string;
  email: string | null;
  isActive: boolean;
  preferredNotificationChannel: "EMAIL" | "TELEGRAM" | "WHATSAPP" | null;
  telegramConnection?: {
    chatId: string | null;
    revokedAt: Date | null;
  } | null;
};

export type NotificationRecipient = {
  guardianId: string;
  channel: DeliverableNotificationChannel;
  destination: string;
};

export function selectGuardianNotificationRecipient(
  guardian: GuardianRecipient,
): NotificationRecipient | null {
  if (!guardian.isActive) return null;
  if (guardian.preferredNotificationChannel === "EMAIL") {
    const destination = guardian.email?.trim();
    return destination
      ? { guardianId: guardian.id, channel: "EMAIL", destination }
      : null;
  }
  if (guardian.preferredNotificationChannel === "TELEGRAM") {
    const connection = guardian.telegramConnection;
    return connection?.chatId && !connection.revokedAt
      ? {
          guardianId: guardian.id,
          channel: "TELEGRAM",
          destination: connection.chatId,
        }
      : null;
  }
  return null;
}

export function eligibleAlertNotificationGuardians(
  alertType: "GROWTH" | "VACCINATION" | "MISSED_FOLLOW_UP",
  guardians: readonly GuardianRecipient[],
) {
  if (alertType !== "MISSED_FOLLOW_UP" && alertType !== "VACCINATION") {
    return [];
  }
  const seen = new Set<string>();
  return guardians.flatMap((guardian) => {
    if (seen.has(guardian.id)) return [];
    seen.add(guardian.id);
    const recipient = selectGuardianNotificationRecipient(guardian);
    return recipient ? [recipient] : [];
  });
}
