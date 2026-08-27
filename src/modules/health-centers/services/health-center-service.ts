import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { getPrisma } from "@/lib/prisma";
import { activeStateSchema } from "@/lib/validation/common-schema";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import {
  healthCenterIdSchema,
  updateHealthCenterSchema,
} from "@/modules/health-centers/schemas/health-center-schema";

const healthCenterSelect = {
  id: true,
  name: true,
  code: true,
  address: true,
  phone: true,
  email: true,
  isActive: true,
  updatedAt: true,
} as const;

export async function listHealthCenters(user: ApplicationUser) {
  authorize(user, "health-center:list");

  return getPrisma().healthCenter.findMany({
    where:
      user.role === "ADMIN" ? undefined : { id: user.healthCenterId ?? "" },
    select: healthCenterSelect,
    orderBy: { name: "asc" },
  });
}

export async function getHealthCenter(user: ApplicationUser, id: string) {
  const healthCenterId = healthCenterIdSchema.parse(id);
  authorize(user, "health-center:read", { healthCenterId });
  const healthCenter = await getPrisma().healthCenter.findUnique({
    where: { id: healthCenterId },
    select: healthCenterSelect,
  });
  if (!healthCenter) throw new ApplicationError("HEALTH_CENTER_NOT_FOUND");
  return healthCenter;
}

export async function updateHealthCenter(
  user: ApplicationUser,
  id: string,
  input: unknown,
) {
  const healthCenterId = healthCenterIdSchema.parse(id);
  authorize(user, "health-center:update", { healthCenterId });
  const data = updateHealthCenterSchema.parse(input);

  const existing = await getPrisma().healthCenter.findUnique({
    where: { id: healthCenterId },
    select: healthCenterSelect,
  });
  if (!existing) throw new ApplicationError("HEALTH_CENTER_NOT_FOUND");

  const changedFields = [
    existing.name !== data.name ? "name" : null,
    existing.code !== data.code ? "code" : null,
    existing.address !== data.address ? "address" : null,
    existing.phone !== data.phone ? "phone" : null,
    existing.email !== data.email ? "email" : null,
  ].filter((value): value is string => Boolean(value));
  return getPrisma().$transaction(async (transaction) => {
    const healthCenter = await transaction.healthCenter.update({
      where: { id: healthCenterId },
      data,
      select: healthCenterSelect,
    });
    await recordAuditEvent(transaction, {
      userId: user.id,
      action: "HEALTH_CENTER_UPDATED",
      entityType: "HealthCenter",
      entityId: healthCenter.id,
      metadata: { changedFields },
    });
    return healthCenter;
  });
}

export async function setHealthCenterActive(
  user: ApplicationUser,
  id: string,
  isActive: boolean,
) {
  const healthCenterId = healthCenterIdSchema.parse(id);
  const activeState = activeStateSchema.parse(isActive);
  authorize(user, "health-center:change-status", { healthCenterId });
  return getPrisma().$transaction(async (transaction) => {
    const healthCenter = await transaction.healthCenter.update({
      where: { id: healthCenterId },
      data: { isActive: activeState },
      select: healthCenterSelect,
    });
    await recordAuditEvent(transaction, {
      userId: user.id,
      action: "HEALTH_CENTER_STATUS_CHANGED",
      entityType: "HealthCenter",
      entityId: healthCenter.id,
      metadata: { isActive: activeState },
    });
    return healthCenter;
  });
}
