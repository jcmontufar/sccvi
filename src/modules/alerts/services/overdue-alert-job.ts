import "server-only";

import { getCurrentBusinessDate } from "@/lib/date/business-date";
import { getPrisma } from "@/lib/prisma";
import type { ApplicationUser } from "@/modules/auth/types";
import type { AlertGenerationSummary } from "@/modules/alerts/services/alert-generation-summary";
import { generateMissedFollowUpAlerts } from "@/modules/alerts/services/missed-follow-up-service";
import { generateVaccinationAlerts } from "@/modules/alerts/services/vaccination-alert-service";

const systemAlertPrincipal: ApplicationUser = {
  id: "system-overdue-alert-job",
  authUserId: "system-overdue-alert-job",
  healthCenterId: null,
  fullName: "Automatización interna SCCVI",
  email: "system@internal.invalid",
  role: "ADMIN",
  isActive: true,
};

export type OverdueAlertJobSummary = {
  startedAt: string;
  completedAt: string;
  businessDate: string;
  centersProcessed: number;
  followUps: AlertGenerationSummary | null;
  vaccinations: AlertGenerationSummary | null;
  errors: (
    "CENTER_SCOPE_FAILED" | "MISSED_FOLLOW_UP_FAILED" | "VACCINATION_FAILED"
  )[];
};

export async function runOverdueAlertJob(currentInstant = new Date()) {
  const startedAt = new Date().toISOString();
  let centersProcessed = 0;
  const errors: OverdueAlertJobSummary["errors"] = [];
  try {
    centersProcessed = (
      await getPrisma().community.findMany({
        where: { children: { some: { isActive: true } } },
        distinct: ["healthCenterId"],
        select: { healthCenterId: true },
      })
    ).length;
  } catch {
    errors.push("CENTER_SCOPE_FAILED");
  }
  let followUps: AlertGenerationSummary | null = null;
  let vaccinations: AlertGenerationSummary | null = null;

  try {
    followUps = await generateMissedFollowUpAlerts(
      systemAlertPrincipal,
      currentInstant,
    );
  } catch {
    errors.push("MISSED_FOLLOW_UP_FAILED");
  }

  try {
    vaccinations = await generateVaccinationAlerts(
      systemAlertPrincipal,
      currentInstant,
    );
  } catch {
    errors.push("VACCINATION_FAILED");
  }

  const summary: OverdueAlertJobSummary = {
    startedAt,
    completedAt: new Date().toISOString(),
    businessDate: getCurrentBusinessDate({ currentInstant }),
    centersProcessed,
    followUps,
    vaccinations,
    errors,
  };
  console.info("SCCVI overdue alert job", summary);
  return summary;
}
