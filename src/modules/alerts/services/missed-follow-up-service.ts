import "server-only";

import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import {
  addAlertBatchToSummary,
  emptyAlertGenerationSummary,
} from "@/modules/alerts/services/alert-generation-summary";
import {
  getFollowUpEvaluationDate,
  getMissedFollowUpAlertIdentity,
} from "@/modules/alerts/services/missed-follow-up-rule";
import { persistOperationalAlertCandidates } from "@/modules/alerts/services/operational-alert-batch";
import type { NotificationProvider } from "@/modules/notifications/services/notification-delivery";

export async function generateMissedFollowUpAlerts(
  user: ApplicationUser,
  currentInstant = new Date(),
  options: { pageSize?: number; provider?: NotificationProvider } = {},
) {
  authorize(user, "alert:review");
  const today = getFollowUpEvaluationDate(currentInstant);
  const pageSize = Math.min(Math.max(options.pageSize ?? 250, 1), 500);
  const summary = emptyAlertGenerationSummary();
  let cursor: string | undefined;

  while (true) {
    const followUps = await getPrisma().growthFollowUp.findMany({
      where: {
        completedAt: null,
        dueDate: { lt: new Date(`${today}T00:00:00.000Z`) },
        child: {
          isActive: true,
          community:
            user.role === "ADMIN"
              ? undefined
              : { healthCenterId: user.healthCenterId ?? "" },
        },
      },
      select: { id: true, childId: true, dueDate: true },
      orderBy: { id: "asc" },
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : undefined,
      take: pageSize,
    });
    if (!followUps.length) break;
    summary.pages += 1;
    summary.recordsEvaluated += followUps.length;
    summary.eligibleFound += followUps.length;

    const batch = await persistOperationalAlertCandidates(
      user,
      followUps.map((followUp) => {
        const identity = getMissedFollowUpAlertIdentity(followUp.id);
        return {
          childId: followUp.childId,
          type: identity.type,
          severity: "PREVENTIVE" as const,
          title: "Seguimiento de crecimiento pendiente",
          message: `El seguimiento programado para ${followUp.dueDate.toLocaleDateString("es-GT", { timeZone: "UTC" })} requiere coordinación con el centro de salud. Esta alerta no constituye un diagnóstico médico.`,
          sourceType: identity.sourceType,
          sourceId: identity.sourceId,
        };
      }),
      options.provider,
    );
    addAlertBatchToSummary(summary, batch);
    cursor = followUps.at(-1)?.id;
    if (followUps.length < pageSize) break;
  }

  return summary;
}
