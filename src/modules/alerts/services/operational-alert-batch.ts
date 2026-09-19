import "server-only";

import type { Alert, Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import type { ApplicationUser } from "@/modules/auth/types";
import {
  sendOperationalAlertEmailsForAlerts,
  type OperationalEmailSummary,
} from "@/modules/notifications/services/alert-email-service";
import type { NotificationProvider } from "@/modules/notifications/services/notification-delivery";

export type OperationalAlertCandidate = Pick<
  Prisma.AlertCreateManyInput,
  | "childId"
  | "type"
  | "severity"
  | "title"
  | "message"
  | "sourceType"
  | "sourceId"
>;

export type OperationalAlertBatchResult = {
  alerts: Alert[];
  alertsCreated: number;
  alertsExisting: number;
  notifications: OperationalEmailSummary;
};

const emptyNotificationSummary = (): OperationalEmailSummary => ({
  eligibleRecipients: 0,
  created: 0,
  existing: 0,
  sent: 0,
  failed: 0,
});

export async function persistOperationalAlertCandidates(
  user: ApplicationUser,
  candidates: readonly OperationalAlertCandidate[],
  provider?: NotificationProvider,
): Promise<OperationalAlertBatchResult> {
  const uniqueCandidates = [
    ...new Map(
      candidates.map((candidate) => [
        `${candidate.type}:${candidate.sourceType}:${candidate.sourceId}`,
        candidate,
      ]),
    ).values(),
  ];
  if (!uniqueCandidates.length) {
    return {
      alerts: [],
      alertsCreated: 0,
      alertsExisting: 0,
      notifications: emptyNotificationSummary(),
    };
  }

  const created = await getPrisma().alert.createMany({
    data: uniqueCandidates,
    skipDuplicates: true,
  });
  const alerts = await getPrisma().alert.findMany({
    where: {
      OR: uniqueCandidates.map(({ type, sourceType, sourceId }) => ({
        type,
        sourceType,
        sourceId,
      })),
    },
  });
  const notifications = await sendOperationalAlertEmailsForAlerts(
    user,
    alerts.map(({ id }) => id),
    provider,
  );

  return {
    alerts,
    alertsCreated: created.count,
    alertsExisting: uniqueCandidates.length - created.count,
    notifications,
  };
}
