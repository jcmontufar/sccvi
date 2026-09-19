import "server-only";

import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import {
  addAlertBatchToSummary,
  emptyAlertGenerationSummary,
} from "@/modules/alerts/services/alert-generation-summary";
import {
  persistOperationalAlertCandidates,
  type OperationalAlertCandidate,
} from "@/modules/alerts/services/operational-alert-batch";
import {
  getVaccinationAlertIdentity,
  shouldCreateVaccinationAlert,
} from "@/modules/alerts/services/vaccination-alert-rule";
import type { NotificationProviderRegistry } from "@/modules/notifications/services/notification-delivery";
import { iterateAuthorizedChildrenVaccinationStatuses } from "@/modules/vaccination/services/vaccination-service";

export async function generateVaccinationAlerts(
  user: ApplicationUser,
  currentInstant = new Date(),
  options: {
    pageSize?: number;
    alertBatchSize?: number;
    providerRegistry?: NotificationProviderRegistry;
  } = {},
) {
  authorize(user, "alert:review");
  const summary = emptyAlertGenerationSummary();
  const alertBatchSize = Math.min(
    Math.max(options.alertBatchSize ?? 100, 1),
    250,
  );
  let candidates: OperationalAlertCandidate[] = [];

  const flush = async () => {
    if (!candidates.length) return;
    const batch = await persistOperationalAlertCandidates(
      user,
      candidates,
      options.providerRegistry,
    );
    addAlertBatchToSummary(summary, batch);
    candidates = [];
  };

  const population = await iterateAuthorizedChildrenVaccinationStatuses(
    user,
    { currentInstant, pageSize: options.pageSize },
    async ({ child, doses }) => {
      summary.recordsEvaluated += doses.length;
      for (const dose of doses) {
        if (!shouldCreateVaccinationAlert(dose.status)) continue;
        summary.eligibleFound += 1;
        const identity = getVaccinationAlertIdentity(child.id, dose.id);
        candidates.push({
          childId: child.id,
          type: identity.type,
          severity: "PREVENTIVE",
          title: "Dosis de vacunación atrasada",
          message: `${dose.vaccineName} — ${dose.doseName} requiere seguimiento con el centro de salud. Esta alerta no constituye un diagnóstico ni una indicación clínica individual.`,
          sourceType: identity.sourceType,
          sourceId: identity.sourceId,
        });
        if (candidates.length >= alertBatchSize) await flush();
      }
    },
  );
  await flush();
  summary.pages = population.pages;

  return summary;
}
