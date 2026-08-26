import "server-only";

import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import {
  getVaccinationAlertIdentity,
  shouldCreateVaccinationAlert,
} from "@/modules/alerts/services/vaccination-alert-rule";
import { sendOperationalAlertEmails } from "@/modules/notifications/services/alert-email-service";
import { listChildVaccinationStatuses } from "@/modules/vaccination/services/vaccination-service";

export async function generateVaccinationAlerts(
  user: ApplicationUser,
  currentInstant = new Date(),
) {
  authorize(user, "alert:review");
  const children = await getPrisma().child.findMany({
    where: {
      isActive: true,
      community:
        user.role === "ADMIN"
          ? undefined
          : { healthCenterId: user.healthCenterId ?? "" },
    },
    select: { id: true },
  });
  const alerts = [];
  for (const child of children) {
    const result = await listChildVaccinationStatuses(
      user,
      child.id,
      currentInstant,
    );
    for (const dose of result.doses.filter((item) =>
      shouldCreateVaccinationAlert(item.status),
    )) {
      const identity = getVaccinationAlertIdentity(child.id, dose.id);
      const alert = await getPrisma().alert.upsert({
        where: { type_sourceType_sourceId: identity },
        update: {},
        create: {
          childId: child.id,
          type: identity.type,
          severity: "PREVENTIVE",
          title: "Dosis de vacunación atrasada",
          message: `${dose.vaccineName} — ${dose.doseName} requiere seguimiento con el centro de salud. Esta alerta no constituye un diagnóstico ni una indicación clínica individual.`,
          sourceType: identity.sourceType,
          sourceId: identity.sourceId,
        },
      });
      await sendOperationalAlertEmails(user, alert.id);
      alerts.push(alert);
    }
  }
  return alerts;
}
