import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import {
  childAccessResource,
  getChild,
} from "@/modules/children/services/child-service";
import {
  alertIdSchema,
  alertInputSchema,
  alertSearchSchema,
} from "@/modules/alerts/schemas/alert-schema";
import { assertAlertTransition } from "@/modules/alerts/services/alert-lifecycle";
import { GROWTH_PERCENTILE_ALERT_SOURCE } from "@/modules/alerts/services/growth-alert-service";
import { calculateExactAge } from "@/modules/growth/utils/exact-age";
import { evaluateWeightForAgeAlert } from "@/modules/growth/services/growth-alert-rule";

const alertInclude = {
  child: {
    include: {
      community: { select: { name: true, healthCenterId: true } },
      childGuardians: {
        include: { guardian: { select: { userId: true, isActive: true } } },
      },
    },
  },
  reviewedBy: { select: { fullName: true } },
  resolvedBy: { select: { fullName: true } },
} as const;

function alertResource(alert: Awaited<ReturnType<typeof findAlert>> & object) {
  return {
    healthCenterId: alert.child.community.healthCenterId,
    guardianUserIds: alert.child.childGuardians.flatMap(({ guardian }) =>
      guardian.userId && guardian.isActive ? [guardian.userId] : [],
    ),
  };
}

async function findAlert(id: string) {
  return getPrisma().alert.findUnique({ where: { id }, include: alertInclude });
}

export async function listAlerts(user: ApplicationUser, input: unknown) {
  authorize(user, "alert:list", {
    guardianUserIds: user.role === "GUARDIAN" ? [user.id] : undefined,
  });
  const filters = alertSearchSchema.parse(input);
  return getPrisma().alert.findMany({
    where: {
      status: filters.status === "ALL" ? undefined : filters.status,
      severity: filters.severity === "ALL" ? undefined : filters.severity,
      child: {
        community:
          user.role === "ADMIN" || user.role === "GUARDIAN"
            ? undefined
            : { healthCenterId: user.healthCenterId ?? "" },
        childGuardians:
          user.role === "GUARDIAN"
            ? { some: { guardian: { userId: user.id, isActive: true } } }
            : undefined,
      },
    },
    include: alertInclude,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getAlert(user: ApplicationUser, id: string) {
  const alert = await findAlert(alertIdSchema.parse(id));
  if (!alert) throw new ApplicationError("ALERT_NOT_FOUND");
  authorize(user, "alert:read", alertResource(alert));
  if (
    alert.type !== "GROWTH" ||
    alert.sourceType !== GROWTH_PERCENTILE_ALERT_SOURCE ||
    !alert.sourceId
  ) {
    return { ...alert, growthContext: null };
  }
  const assessment = await getPrisma().growthAssessment.findFirst({
    where: {
      id: alert.sourceId,
      indicator: "WEIGHT_FOR_AGE",
      growthRecord: { childId: alert.childId },
    },
    select: {
      percentile: true,
      growthRecord: {
        select: {
          measurementDate: true,
          weightKg: true,
          child: { select: { dateOfBirth: true } },
        },
      },
    },
  });
  if (!assessment?.percentile) return { ...alert, growthContext: null };
  const percentile = Number(assessment.percentile.toString());
  if (!evaluateWeightForAgeAlert("WEIGHT_FOR_AGE", percentile)) {
    return { ...alert, growthContext: null };
  }
  const measurementDate = assessment.growthRecord.measurementDate
    .toISOString()
    .slice(0, 10);
  const age = calculateExactAge(
    assessment.growthRecord.child.dateOfBirth.toISOString().slice(0, 10),
    measurementDate,
  );
  return {
    ...alert,
    growthContext: {
      measurementDate,
      ageMonths: age.years * 12 + age.months,
      weightKg: assessment.growthRecord.weightKg.toString(),
      percentile,
    },
  };
}

export async function createAlert(user: ApplicationUser, input: unknown) {
  const data = alertInputSchema.parse(input);
  const child = await getChild(user, data.childId);
  authorize(user, "alert:review", childAccessResource(child));
  return getPrisma().alert.create({ data });
}

export async function reviewAlert(user: ApplicationUser, id: string) {
  const alert = await getAlert(user, id);
  authorize(user, "alert:review", alertResource(alert));
  assertAlertTransition(alert.status, "REVIEWED");
  return getPrisma().$transaction(async (transaction) => {
    const reviewed = await transaction.alert.update({
      where: { id: alert.id },
      data: {
        status: "REVIEWED",
        reviewedAt: new Date(),
        reviewedByUserId: user.id,
      },
    });
    await recordAuditEvent(transaction, {
      userId: user.id,
      action: "ALERT_REVIEWED",
      entityType: "Alert",
      entityId: alert.id,
      metadata: { childId: alert.childId },
    });
    return reviewed;
  });
}

export async function resolveAlert(user: ApplicationUser, id: string) {
  const alert = await getAlert(user, id);
  authorize(user, "alert:resolve", alertResource(alert));
  assertAlertTransition(alert.status, "RESOLVED");
  return getPrisma().$transaction(async (transaction) => {
    const resolved = await transaction.alert.update({
      where: { id: alert.id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolvedByUserId: user.id,
      },
    });
    await recordAuditEvent(transaction, {
      userId: user.id,
      action: "ALERT_RESOLVED",
      entityType: "Alert",
      entityId: alert.id,
      metadata: { childId: alert.childId },
    });
    return resolved;
  });
}
