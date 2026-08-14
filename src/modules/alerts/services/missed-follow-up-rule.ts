import { getCurrentBusinessDate } from "@/lib/date/business-date";

export function getFollowUpEvaluationDate(currentInstant = new Date()) {
  return getCurrentBusinessDate({ currentInstant });
}

export function getMissedFollowUpAlertIdentity(followUpId: string) {
  return {
    type: "MISSED_FOLLOW_UP" as const,
    sourceType: "GrowthFollowUp",
    sourceId: followUpId,
  };
}

export function shouldCreateMissedFollowUpAlert(
  followUp: { dueDate?: string; completedAt?: Date | null },
  currentInstant = new Date(),
) {
  if (!followUp.dueDate || followUp.completedAt) return false;
  return followUp.dueDate < getFollowUpEvaluationDate(currentInstant);
}
