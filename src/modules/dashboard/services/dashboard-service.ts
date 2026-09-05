import "server-only";

import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import { listAuthorizedChildrenVaccinationStatuses } from "@/modules/vaccination/services/vaccination-service";

export async function getDashboardMetrics(user: ApplicationUser) {
  authorize(user, "dashboard:read", {
    guardianUserIds: user.role === "GUARDIAN" ? [user.id] : undefined,
  });
  const centerFilter =
    user.role === "ADMIN" || user.role === "GUARDIAN"
      ? undefined
      : { healthCenterId: user.healthCenterId ?? "" };
  const childWhere = {
    isActive: true,
    community: centerFilter,
    childGuardians:
      user.role === "GUARDIAN"
        ? { some: { guardian: { userId: user.id, isActive: true } } }
        : undefined,
  } as const;
  const [
    children,
    communities,
    guardians,
    growthRecords,
    openAlerts,
    vaccinationStatuses,
  ] = await Promise.all([
    getPrisma().child.count({ where: childWhere }),
    user.role === "GUARDIAN"
      ? Promise.resolve(0)
      : getPrisma().community.count({
          where: { isActive: true, ...centerFilter },
        }),
    user.role === "GUARDIAN"
      ? Promise.resolve(0)
      : getPrisma().guardian.count({
          where: { isActive: true, community: centerFilter },
        }),
    getPrisma().growthRecord.count({ where: { child: childWhere } }),
    getPrisma().alert.count({ where: { status: "OPEN", child: childWhere } }),
    listAuthorizedChildrenVaccinationStatuses(user),
  ]);
  const doses = vaccinationStatuses.flatMap(({ doses }) => doses);
  const pendingVaccinations = doses.filter(
    (dose) => dose.status === "PENDING",
  ).length;
  const overdueVaccinations = doses.filter(
    (dose) => dose.status === "OVERDUE",
  ).length;
  const appliedVaccinations = doses.filter(
    (dose) => dose.status === "APPLIED",
  ).length;

  const [alertGroups, attentionAlerts, communityRows, recentMeasurements] =
    await Promise.all([
      getPrisma().alert.groupBy({
        by: ["type", "severity"],
        where: { status: "OPEN", child: childWhere },
        _count: { _all: true },
      }),
      getPrisma().alert.findMany({
        where: { status: "OPEN", child: childWhere },
        select: {
          id: true,
          type: true,
          severity: true,
          title: true,
          createdAt: true,
          child: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      getPrisma().community.findMany({
        where:
          user.role === "GUARDIAN"
            ? {
                isActive: true,
                children: {
                  some: {
                    isActive: true,
                    childGuardians: {
                      some: {
                        guardian: { userId: user.id, isActive: true },
                      },
                    },
                  },
                },
              }
            : { isActive: true, ...centerFilter },
        select: {
          name: true,
          _count: {
            select: {
              children: {
                where: {
                  isActive: true,
                  childGuardians:
                    user.role === "GUARDIAN"
                      ? {
                          some: {
                            guardian: { userId: user.id, isActive: true },
                          },
                        }
                      : undefined,
                },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      getPrisma().growthRecord.findMany({
        where: { child: childWhere },
        select: {
          id: true,
          measurementDate: true,
          child: { select: { id: true, fullName: true } },
        },
        orderBy: [{ measurementDate: "desc" }, { createdAt: "desc" }],
        take: 5,
      }),
    ]);

  const overdueAttention = vaccinationStatuses.flatMap(({ child, doses }) =>
    doses
      .filter((dose) => dose.status === "OVERDUE")
      .map((dose) => ({
        id: `vaccination-${child.id}-${dose.id}`,
        kind: "VACCINATION" as const,
        title: `${dose.vaccineName} — ${dose.doseName}`,
        childName: child.fullName,
        href: `/app/ninos/${child.id}/vacunacion`,
      })),
  );

  return {
    children,
    communities,
    guardians,
    growthRecords,
    openAlerts,
    appliedVaccinations,
    pendingVaccinations,
    overdueVaccinations,
    vaccinationStatus: [
      { status: "APPLIED" as const, count: appliedVaccinations },
      { status: "PENDING" as const, count: pendingVaccinations },
      { status: "OVERDUE" as const, count: overdueVaccinations },
    ],
    alertDistribution: alertGroups.map((group) => ({
      type: group.type,
      severity: group.severity,
      count: group._count._all,
    })),
    communityDistribution: communityRows.map((community) => ({
      name: community.name,
      children: community._count.children,
    })),
    requiresAttention: [
      ...attentionAlerts.map((alert) => ({
        id: `alert-${alert.id}`,
        kind: "ALERT" as const,
        title: alert.title,
        childName: alert.child.fullName,
        severity: alert.severity,
        href: `/app/alertas/${alert.id}`,
      })),
      ...overdueAttention,
    ].slice(0, 6),
    recentMeasurements: recentMeasurements.map((measurement) => ({
      id: measurement.id,
      childName: measurement.child.fullName,
      childId: measurement.child.id,
      measurementDate: measurement.measurementDate.toISOString().slice(0, 10),
    })),
  };
}

export type DashboardMetrics = Awaited<ReturnType<typeof getDashboardMetrics>>;
