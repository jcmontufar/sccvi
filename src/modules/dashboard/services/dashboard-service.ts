import "server-only";

import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import { listChildVaccinationStatuses } from "@/modules/vaccination/services/vaccination-service";

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
    childIds,
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
    getPrisma().child.findMany({ where: childWhere, select: { id: true } }),
  ]);
  let pendingVaccinations = 0;
  let overdueVaccinations = 0;
  for (const child of childIds) {
    const result = await listChildVaccinationStatuses(user, child.id);
    pendingVaccinations += result.doses.filter(
      (dose) => dose.status === "PENDING",
    ).length;
    overdueVaccinations += result.doses.filter(
      (dose) => dose.status === "OVERDUE",
    ).length;
  }
  return {
    children,
    communities,
    guardians,
    growthRecords,
    openAlerts,
    pendingVaccinations,
    overdueVaccinations,
  };
}
