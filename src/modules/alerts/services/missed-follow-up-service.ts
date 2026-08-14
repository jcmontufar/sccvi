import "server-only";

import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import { getFollowUpEvaluationDate } from "@/modules/alerts/services/missed-follow-up-rule";
import { sendOperationalAlertEmails } from "@/modules/notifications/services/alert-email-service";

export async function generateMissedFollowUpAlerts(
  user: ApplicationUser,
  currentInstant = new Date(),
) {
  authorize(user, "alert:review");
  const today = getFollowUpEvaluationDate(currentInstant);
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
    include: { child: { select: { fullName: true } } },
    orderBy: { dueDate: "asc" },
  });

  const alerts = [];
  for (const followUp of followUps) {
    const alert = await getPrisma().alert.upsert({
      where: {
        type_sourceType_sourceId: {
          type: "MISSED_FOLLOW_UP",
          sourceType: "GrowthFollowUp",
          sourceId: followUp.id,
        },
      },
      update: {},
      create: {
        childId: followUp.childId,
        type: "MISSED_FOLLOW_UP",
        severity: "PREVENTIVE",
        title: "Seguimiento de crecimiento pendiente",
        message: `El seguimiento programado para ${followUp.dueDate.toLocaleDateString("es-GT", { timeZone: "UTC" })} requiere coordinación con el centro de salud. Esta alerta no constituye un diagnóstico médico.`,
        sourceType: "GrowthFollowUp",
        sourceId: followUp.id,
      },
    });
    await sendOperationalAlertEmails(user, alert.id);
    alerts.push(alert);
  }
  return alerts;
}
