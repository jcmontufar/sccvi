type GuardianRecipient = {
  id: string;
  email: string | null;
  isActive: boolean;
  preferredNotificationChannel: "EMAIL" | "TELEGRAM" | "WHATSAPP" | null;
};

export function eligibleAlertEmailGuardians(
  alertType: "GROWTH" | "VACCINATION" | "MISSED_FOLLOW_UP",
  guardians: readonly GuardianRecipient[],
) {
  if (!["MISSED_FOLLOW_UP", "VACCINATION"].includes(alertType)) return [];
  const seen = new Set<string>();
  return guardians.filter((guardian) => {
    if (
      !guardian.isActive ||
      guardian.preferredNotificationChannel !== "EMAIL" ||
      !guardian.email?.trim() ||
      seen.has(guardian.id)
    ) {
      return false;
    }
    seen.add(guardian.id);
    return true;
  });
}
