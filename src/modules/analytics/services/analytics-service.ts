import "server-only";

import { Prisma } from "@/generated/prisma/client";
import {
  getBusinessDateUtcRange,
  getCurrentBusinessDate,
} from "@/lib/date/business-date";
import { ApplicationError } from "@/lib/errors/application-error";
import { getPrisma } from "@/lib/prisma";
import {
  coveragePercentage,
  differenceInCalendarDays,
  isHighWeightPercentile,
  isLowWeightPercentile,
  monthKey,
  toDateOnly,
} from "@/modules/analytics/services/analytics-calculations";
import { resolveAnalyticsCenterId } from "@/modules/analytics/services/analytics-authorization";
import { analyticsFilterSchema } from "@/modules/analytics/schemas/analytics-filter-schema";
import type {
  AnalyticsPriority,
  AnalyticsResult,
  AnalyticsTrend,
  TerritorialAnalytics,
} from "@/modules/analytics/types/analytics";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import { iterateAuthorizedChildrenVaccinationStatuses } from "@/modules/vaccination/services/vaccination-service";

function atStart(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function atEnd(date: string) {
  return new Date(`${date}T23:59:59.999Z`);
}

function dateAtMonthsBefore(date: string, months: number) {
  const value = atStart(date);
  const originalDay = value.getUTCDate();
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() - months);
  const lastDay = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0),
  ).getUTCDate();
  value.setUTCDate(Math.min(originalDay, lastDay));
  return value;
}

function buildTrend(from: string, to: string) {
  const formatter = new Intl.DateTimeFormat("es-GT", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const cursor = atStart(`${from.slice(0, 7)}-01`);
  const end = atStart(`${to.slice(0, 7)}-01`);
  const rows = new Map<string, AnalyticsTrend>();
  while (cursor <= end) {
    const period = monthKey(cursor);
    rows.set(period, {
      period,
      label: formatter.format(cursor),
      measurements: 0,
      measuredChildren: 0,
      vaccinations: 0,
      alertsGenerated: 0,
      alertsResolved: 0,
      followUpsDue: 0,
      followUpsCompleted: 0,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return rows;
}

function alertStatusAt(
  alert: {
    reviewedAt: Date | null;
    resolvedAt: Date | null;
  },
  cutoffDate: string,
) {
  const cutoff = getBusinessDateUtcRange(cutoffDate).end;
  if (alert.resolvedAt && alert.resolvedAt <= cutoff) return "RESOLVED";
  if (alert.reviewedAt && alert.reviewedAt <= cutoff) return "REVIEWED";
  return "OPEN";
}

function topPriorities(items: AnalyticsPriority[]) {
  return items
    .sort(
      (left, right) =>
        right.daysPending - left.daysPending ||
        left.childName.localeCompare(right.childName, "es"),
    )
    .slice(0, 10);
}

export async function getAnalytics(
  user: ApplicationUser,
  input: unknown,
  currentInstant = new Date(),
): Promise<AnalyticsResult> {
  authorize(user, "report:read", { healthCenterId: user.healthCenterId });
  const filters = analyticsFilterSchema.parse(input);
  if (filters.cutoffDate > getCurrentBusinessDate({ currentInstant })) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "La fecha de corte no puede estar en el futuro.",
    );
  }
  const selectedCenterId = resolveAnalyticsCenterId(
    user,
    filters.healthCenterId,
  );

  const dateOfBirth: { gt?: Date; lte?: Date } = {};
  if (filters.minAgeMonths !== "") {
    dateOfBirth.lte = dateAtMonthsBefore(
      filters.cutoffDate,
      filters.minAgeMonths,
    );
  }
  if (filters.maxAgeMonths !== "") {
    dateOfBirth.gt = dateAtMonthsBefore(
      filters.cutoffDate,
      filters.maxAgeMonths + 1,
    );
  }
  const childWhere: Prisma.ChildWhereInput = {
    isActive: true,
    communityId: filters.communityId || undefined,
    sex: filters.sex === "ALL" ? undefined : filters.sex,
    dateOfBirth: Object.keys(dateOfBirth).length ? dateOfBirth : undefined,
    community: { healthCenterId: selectedCenterId },
  };
  const period = { gte: atStart(filters.from), lte: atEnd(filters.to) };
  const timestampPeriod = {
    gte: getBusinessDateUtcRange(filters.from).start,
    lte: getBusinessDateUtcRange(filters.to).end,
  };
  const cutoff = getBusinessDateUtcRange(filters.cutoffDate).end;
  const prisma = getPrisma();

  const [healthCenters, communities] = await Promise.all([
    user.role === "ADMIN"
      ? prisma.healthCenter.findMany({
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : prisma.healthCenter.findMany({
          where: { id: user.healthCenterId ?? "" },
          select: { id: true, name: true },
        }),
    prisma.community.findMany({
      where: { healthCenterId: selectedCenterId, isActive: true },
      select: {
        id: true,
        name: true,
        healthCenter: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);
  if (
    filters.communityId &&
    !communities.some(({ id }) => id === filters.communityId)
  ) {
    throw new ApplicationError("FORBIDDEN");
  }

  const territory = new Map<string, TerritorialAnalytics>(
    communities
      .filter(
        (community) =>
          !filters.communityId || community.id === filters.communityId,
      )
      .map((community) => [
        community.id,
        {
          communityId: community.id,
          community: community.name,
          healthCenter: community.healthCenter.name,
          children: 0,
          measurements: 0,
          overdueFollowUps: 0,
          overdueDoses: 0,
          openAlerts: 0,
          criticalAlerts: 0,
          lowPercentile: 0,
          highPercentile: 0,
        },
      ]),
  );

  const [childrenByCommunity, growthRecords] = await Promise.all([
    prisma.child.groupBy({
      by: ["communityId"],
      where: childWhere,
      _count: { _all: true },
    }),
    prisma.growthRecord.findMany({
      where: { measurementDate: period, child: childWhere },
      select: {
        id: true,
        childId: true,
        measurementDate: true,
        child: { select: { communityId: true } },
      },
    }),
  ]);
  const [followUps, assessments] = await Promise.all([
    prisma.growthFollowUp.findMany({
      where: {
        child: childWhere,
        OR: [
          { dueDate: { lte: cutoff } },
          { dueDate: period },
          { completedAt: timestampPeriod },
        ],
      },
      select: {
        id: true,
        childId: true,
        dueDate: true,
        completedAt: true,
        child: {
          select: {
            fullName: true,
            communityId: true,
            community: { select: { name: true } },
          },
        },
      },
    }),
    prisma.growthAssessment.findMany({
      where: {
        indicator: "WEIGHT_FOR_AGE",
        growthRecord: { measurementDate: period, child: childWhere },
      },
      select: {
        percentile: true,
        growthRecord: {
          select: { childId: true, child: { select: { communityId: true } } },
        },
      },
    }),
  ]);
  const [vaccinations, alerts] = await Promise.all([
    prisma.vaccination.findMany({
      where: { applicationDate: period, child: childWhere },
      select: { applicationDate: true, childId: true },
    }),
    prisma.alert.findMany({
      where: {
        child: childWhere,
        createdAt: { lte: cutoff },
        type: filters.alertType === "ALL" ? undefined : filters.alertType,
        severity:
          filters.alertSeverity === "ALL" ? undefined : filters.alertSeverity,
        OR: [
          { createdAt: timestampPeriod },
          { resolvedAt: timestampPeriod },
          { resolvedAt: { gt: cutoff } },
          { resolvedAt: null },
        ],
      },
      select: {
        id: true,
        childId: true,
        type: true,
        severity: true,
        title: true,
        createdAt: true,
        reviewedAt: true,
        resolvedAt: true,
        child: {
          select: {
            fullName: true,
            communityId: true,
            community: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  for (const row of childrenByCommunity) {
    const item = territory.get(row.communityId);
    if (item) item.children = row._count._all;
  }
  const trends = buildTrend(filters.from, filters.to);
  const measuredByMonth = new Map<string, Set<string>>();
  for (const record of growthRecords) {
    const item = territory.get(record.child.communityId);
    if (item) item.measurements += 1;
    const key = monthKey(record.measurementDate);
    const trend = trends.get(key);
    if (trend) {
      trend.measurements += 1;
      const children = measuredByMonth.get(key) ?? new Set<string>();
      children.add(record.childId);
      measuredByMonth.set(key, children);
    }
  }
  for (const [key, children] of measuredByMonth) {
    const trend = trends.get(key);
    if (trend) trend.measuredChildren = children.size;
  }
  for (const vaccination of vaccinations) {
    const trend = trends.get(monthKey(vaccination.applicationDate));
    if (trend) trend.vaccinations += 1;
  }

  const overdueFollowUpChildren = new Set<string>();
  const followUpPriorities: AnalyticsPriority[] = [];
  for (const followUp of followUps) {
    const dueDate = toDateOnly(followUp.dueDate);
    if (dueDate >= filters.from && dueDate <= filters.to) {
      const trend = trends.get(monthKey(dueDate));
      if (trend) trend.followUpsDue += 1;
    }
    if (followUp.completedAt) {
      const completedDate = getCurrentBusinessDate({
        currentInstant: followUp.completedAt,
      });
      if (completedDate >= filters.from && completedDate <= filters.to) {
        const trend = trends.get(monthKey(completedDate));
        if (trend) trend.followUpsCompleted += 1;
      }
    }
    const completedAtCutoff =
      followUp.completedAt && followUp.completedAt <= cutoff;
    if (!completedAtCutoff && dueDate < filters.cutoffDate) {
      overdueFollowUpChildren.add(followUp.childId);
      const item = territory.get(followUp.child.communityId);
      if (item) item.overdueFollowUps += 1;
      followUpPriorities.push({
        id: followUp.id,
        childId: followUp.childId,
        childName: followUp.child.fullName,
        community: followUp.child.community.name,
        label: "Seguimiento de crecimiento vencido",
        date: dueDate,
        daysPending: differenceInCalendarDays(filters.cutoffDate, dueDate),
      });
    }
  }

  const lowChildren = new Set<string>();
  const highChildren = new Set<string>();
  let lowEvaluations = 0;
  let highEvaluations = 0;
  for (const assessment of assessments) {
    const percentile =
      assessment.percentile !== null ? Number(assessment.percentile) : null;
    const item = territory.get(assessment.growthRecord.child.communityId);
    if (isLowWeightPercentile(percentile)) {
      lowEvaluations += 1;
      lowChildren.add(assessment.growthRecord.childId);
      if (item) item.lowPercentile += 1;
    }
    if (isHighWeightPercentile(percentile)) {
      highEvaluations += 1;
      highChildren.add(assessment.growthRecord.childId);
      if (item) item.highPercentile += 1;
    }
  }

  const alertPriorities: AnalyticsPriority[] = [];
  let openAlerts = 0;
  let criticalAlerts = 0;
  for (const alert of alerts) {
    const status = alertStatusAt(alert, filters.cutoffDate);
    if (filters.alertStatus !== "ALL" && status !== filters.alertStatus)
      continue;
    const createdDate = getCurrentBusinessDate({
      currentInstant: alert.createdAt,
    });
    if (createdDate >= filters.from && createdDate <= filters.to) {
      const trend = trends.get(monthKey(createdDate));
      if (trend) trend.alertsGenerated += 1;
    }
    if (alert.resolvedAt) {
      const resolvedDate = getCurrentBusinessDate({
        currentInstant: alert.resolvedAt,
      });
      if (resolvedDate >= filters.from && resolvedDate <= filters.to) {
        const trend = trends.get(monthKey(resolvedDate));
        if (trend) trend.alertsResolved += 1;
      }
    }
    if (status === "OPEN") {
      openAlerts += 1;
      if (alert.severity === "CRITICAL") criticalAlerts += 1;
      const item = territory.get(alert.child.communityId);
      if (item) {
        item.openAlerts += 1;
        if (alert.severity === "CRITICAL") item.criticalAlerts += 1;
      }
      alertPriorities.push({
        id: alert.id,
        childId: alert.childId,
        childName: alert.child.fullName,
        community: alert.child.community.name,
        label: alert.title,
        date: createdDate,
        daysPending: differenceInCalendarDays(filters.cutoffDate, createdDate),
      });
    }
  }

  const coverage = new Map(
    [...territory.values()].map((item) => [
      item.communityId,
      { applied: 0, eligible: 0 },
    ]),
  );
  const vaccinationPriorities: AnalyticsPriority[] = [];
  let overdueDoses = 0;
  const iteration = await iterateAuthorizedChildrenVaccinationStatuses(
    user,
    {
      currentInstant: new Date(`${filters.cutoffDate}T12:00:00.000Z`),
      pageSize: 250,
      filters: {
        healthCenterId: selectedCenterId,
        communityId: filters.communityId || undefined,
        sex: filters.sex === "ALL" ? undefined : filters.sex,
        dateOfBirth: Object.keys(dateOfBirth).length ? dateOfBirth : undefined,
      },
    },
    ({ child, doses }) => {
      const item = territory.get(child.community.id);
      for (const dose of doses) {
        if (dose.status === "OVERDUE") {
          overdueDoses += 1;
          if (item) item.overdueDoses += 1;
          vaccinationPriorities.push({
            id: `${child.id}:${dose.id}`,
            childId: child.id,
            childName: child.fullName,
            community: child.community.name,
            label: `${dose.vaccineName} — ${dose.doseName}`,
            date: dose.scheduledDate,
            daysPending: differenceInCalendarDays(
              filters.cutoffDate,
              dose.scheduledDate,
            ),
          });
        }
      }
      if (!filters.doseCode) return;
      const dose = doses.find(({ doseCode }) => doseCode === filters.doseCode);
      if (!dose?.applicable || dose.scheduledDate > filters.cutoffDate) return;
      const values = coverage.get(child.community.id);
      if (!values) return;
      values.eligible += 1;
      if (dose.status === "APPLIED") values.applied += 1;
    },
  );
  if (
    filters.doseCode &&
    !iteration.doses.some(({ doseCode }) => doseCode === filters.doseCode)
  ) {
    throw new ApplicationError("VACCINE_SCHEDULE_NOT_FOUND");
  }

  const sortedTerritories = [...territory.values()].sort(
    (left, right) =>
      right[filters.sortBy] - left[filters.sortBy] ||
      left.community.localeCompare(right.community, "es"),
  );
  const activeChildren = childrenByCommunity.reduce(
    (total, row) => total + row._count._all,
    0,
  );

  return {
    filters,
    summary: {
      activeChildren,
      measurements: growthRecords.length,
      overdueFollowUps: overdueFollowUpChildren.size,
      overdueDoses,
      openAlerts,
      criticalAlerts,
    },
    trends: [...trends.values()],
    territories: sortedTerritories,
    vaccination: {
      versionCode: iteration.versionCode,
      doseCode: filters.doseCode,
      coverage: sortedTerritories.map((item) => {
        const values = coverage.get(item.communityId) ?? {
          applied: 0,
          eligible: 0,
        };
        return {
          communityId: item.communityId,
          community: item.community,
          ...values,
          percentage: coveragePercentage(values.applied, values.eligible),
        };
      }),
      overdueByCommunity: sortedTerritories.map((item) => ({
        label: item.community,
        value: item.overdueDoses,
      })),
    },
    growth: {
      lowEvaluations,
      lowChildren: lowChildren.size,
      highEvaluations,
      highChildren: highChildren.size,
    },
    priorities: {
      followUps: topPriorities(followUpPriorities),
      vaccinations: topPriorities(vaccinationPriorities),
      alerts: topPriorities(alertPriorities),
    },
    options: {
      healthCenters,
      communities: communities.map(({ id, name }) => ({ id, name })),
      doses: iteration.doses,
    },
    processing: {
      vaccinationPages: iteration.pages,
      childrenEvaluated: iteration.childrenEvaluated,
    },
  };
}
