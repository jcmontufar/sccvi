import type { OperationalAlertBatchResult } from "@/modules/alerts/services/operational-alert-batch";

export type AlertGenerationSummary = {
  recordsEvaluated: number;
  eligibleFound: number;
  alertsCreated: number;
  alertsExisting: number;
  notificationsCreated: number;
  notificationsExisting: number;
  notificationsSent: number;
  notificationsFailed: number;
  pages: number;
};

export const emptyAlertGenerationSummary = (): AlertGenerationSummary => ({
  recordsEvaluated: 0,
  eligibleFound: 0,
  alertsCreated: 0,
  alertsExisting: 0,
  notificationsCreated: 0,
  notificationsExisting: 0,
  notificationsSent: 0,
  notificationsFailed: 0,
  pages: 0,
});

export function addAlertBatchToSummary(
  summary: AlertGenerationSummary,
  batch: OperationalAlertBatchResult,
) {
  summary.alertsCreated += batch.alertsCreated;
  summary.alertsExisting += batch.alertsExisting;
  summary.notificationsCreated += batch.notifications.created;
  summary.notificationsExisting += batch.notifications.existing;
  summary.notificationsSent += batch.notifications.sent;
  summary.notificationsFailed += batch.notifications.failed;
}
