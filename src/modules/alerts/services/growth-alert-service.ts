import type { Prisma } from "@/generated/prisma/client";
import { evaluateWeightForAgeAlert } from "@/modules/growth/services/growth-alert-rule";

export const GROWTH_PERCENTILE_ALERT_SOURCE =
  "GROWTH_ASSESSMENT_WEIGHT_PERCENTILE";

type PersistedAssessment = {
  id: string;
  indicator: "WEIGHT_FOR_AGE" | "HEIGHT_FOR_AGE";
  percentile: { toString(): string } | null;
};

export async function syncGrowthPercentileAlerts(
  transaction: Prisma.TransactionClient,
  childId: string,
  assessments: readonly PersistedAssessment[],
) {
  const results = [];
  for (const assessment of assessments) {
    if (assessment.indicator !== "WEIGHT_FOR_AGE") continue;
    const rule = evaluateWeightForAgeAlert(
      assessment.indicator,
      assessment.percentile === null
        ? null
        : Number(assessment.percentile.toString()),
    );
    if (!rule) {
      await transaction.alert.updateMany({
        where: {
          type: "GROWTH",
          sourceType: GROWTH_PERCENTILE_ALERT_SOURCE,
          sourceId: assessment.id,
          status: { not: "RESOLVED" },
        },
        data: { status: "RESOLVED", resolvedAt: new Date() },
      });
      continue;
    }
    results.push(
      await transaction.alert.upsert({
        where: {
          type_sourceType_sourceId: {
            type: "GROWTH",
            sourceType: GROWTH_PERCENTILE_ALERT_SOURCE,
            sourceId: assessment.id,
          },
        },
        update: {
          title: rule.title,
          message: rule.message,
          status: "OPEN",
          reviewedAt: null,
          reviewedByUserId: null,
          resolvedAt: null,
          resolvedByUserId: null,
        },
        create: {
          childId,
          type: "GROWTH",
          severity: "PREVENTIVE",
          title: rule.title,
          message: rule.message,
          sourceType: GROWTH_PERCENTILE_ALERT_SOURCE,
          sourceId: assessment.id,
        },
      }),
    );
  }
  return results;
}
