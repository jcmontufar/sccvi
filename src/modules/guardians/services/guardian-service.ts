import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { getPrisma } from "@/lib/prisma";
import { activeStateSchema } from "@/lib/validation/common-schema";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import {
  guardianIdSchema,
  guardianInputSchema,
  guardianSearchSchema,
} from "@/modules/guardians/schemas/guardian-schema";

const guardianSelect = {
  id: true,
  communityId: true,
  userId: true,
  fullName: true,
  identification: true,
  phone: true,
  email: true,
  preferredNotificationChannel: true,
  isActive: true,
  community: {
    select: {
      name: true,
      healthCenterId: true,
      healthCenter: { select: { name: true } },
    },
  },
  childGuardians: {
    select: {
      relationshipType: true,
      isPrimary: true,
      child: { select: { id: true, fullName: true, isActive: true } },
    },
    orderBy: { child: { fullName: "asc" as const } },
  },
  telegramConnection: {
    select: {
      linkedAt: true,
      consentedAt: true,
      revokedAt: true,
    },
  },
} as const;

async function authorizeCommunity(
  user: ApplicationUser,
  communityId: string,
  action: "guardian:create" | "guardian:update",
) {
  const community = await getPrisma().community.findUnique({
    where: { id: communityId },
    select: { healthCenterId: true, isActive: true },
  });
  if (!community?.isActive) throw new ApplicationError("COMMUNITY_NOT_FOUND");
  authorize(user, action, { healthCenterId: community.healthCenterId });
  return community;
}

export async function listGuardians(user: ApplicationUser, input: unknown) {
  authorize(user, "guardian:list");
  const filters = guardianSearchSchema.parse(input);
  return getPrisma().guardian.findMany({
    where: {
      community: {
        healthCenterId:
          user.role === "ADMIN" ? undefined : (user.healthCenterId ?? ""),
      },
      communityId: filters.communityId || undefined,
      isActive:
        filters.status === "all" ? undefined : filters.status === "active",
      OR: filters.search
        ? [
            { fullName: { contains: filters.search, mode: "insensitive" } },
            {
              identification: { contains: filters.search, mode: "insensitive" },
            },
          ]
        : undefined,
    },
    select: guardianSelect,
    orderBy: { fullName: "asc" },
    take: 100,
  });
}

export async function getGuardian(user: ApplicationUser, id: string) {
  const guardianId = guardianIdSchema.parse(id);
  const guardian = await getPrisma().guardian.findUnique({
    where: { id: guardianId },
    select: guardianSelect,
  });
  if (!guardian) throw new ApplicationError("GUARDIAN_NOT_FOUND");

  authorize(user, "guardian:read", {
    healthCenterId: guardian.community.healthCenterId,
    guardianUserIds: guardian.userId ? [guardian.userId] : [],
  });
  return guardian;
}

async function validateOptionalUser(
  userId: string | null | undefined,
  healthCenterId: string,
) {
  if (!userId) return;
  const linkedUser = await getPrisma().user.findUnique({
    where: { id: userId },
    select: { role: true, healthCenterId: true, isActive: true },
  });
  if (
    !linkedUser?.isActive ||
    linkedUser.role !== "GUARDIAN" ||
    linkedUser.healthCenterId !== healthCenterId
  ) {
    throw new ApplicationError("VALIDATION_ERROR");
  }
}

export async function createGuardian(user: ApplicationUser, input: unknown) {
  const data = guardianInputSchema.parse(input);
  const community = await authorizeCommunity(
    user,
    data.communityId,
    "guardian:create",
  );
  await validateOptionalUser(data.userId, community.healthCenterId);
  return getPrisma().$transaction(async (transaction) => {
    const guardian = await transaction.guardian.create({
      data,
      select: guardianSelect,
    });
    await recordAuditEvent(transaction, {
      userId: user.id,
      action: "GUARDIAN_CREATED",
      entityType: "Guardian",
      entityId: guardian.id,
      metadata: { communityId: guardian.communityId },
    });
    return guardian;
  });
}

export async function updateGuardian(
  user: ApplicationUser,
  id: string,
  input: unknown,
) {
  const guardian = await getGuardian(user, id);
  authorize(user, "guardian:update", {
    healthCenterId: guardian.community.healthCenterId,
  });
  const data = guardianInputSchema.parse(input);
  const community = await authorizeCommunity(
    user,
    data.communityId,
    "guardian:update",
  );
  await validateOptionalUser(data.userId, community.healthCenterId);
  const changedFields = [
    guardian.communityId !== data.communityId ? "communityId" : null,
    guardian.fullName !== data.fullName ? "fullName" : null,
    guardian.identification !== data.identification ? "identification" : null,
    guardian.phone !== data.phone ? "phone" : null,
    guardian.email !== data.email ? "email" : null,
    guardian.preferredNotificationChannel !== data.preferredNotificationChannel
      ? "preferredNotificationChannel"
      : null,
    guardian.userId !== data.userId ? "userId" : null,
  ].filter((value): value is string => Boolean(value));
  return getPrisma().$transaction(async (transaction) => {
    const updated = await transaction.guardian.update({
      where: { id: guardian.id },
      data,
      select: guardianSelect,
    });
    await recordAuditEvent(transaction, {
      userId: user.id,
      action: "GUARDIAN_UPDATED",
      entityType: "Guardian",
      entityId: guardian.id,
      metadata: { changedFields },
    });
    return updated;
  });
}

export async function setGuardianActive(
  user: ApplicationUser,
  id: string,
  isActive: boolean,
) {
  const activeState = activeStateSchema.parse(isActive);
  const guardian = await getGuardian(user, id);
  authorize(user, "guardian:deactivate", {
    healthCenterId: guardian.community.healthCenterId,
  });
  return getPrisma().$transaction(async (transaction) => {
    const updated = await transaction.guardian.update({
      where: { id: guardian.id },
      data: { isActive: activeState },
      select: guardianSelect,
    });
    await recordAuditEvent(transaction, {
      userId: user.id,
      action: "GUARDIAN_STATUS_CHANGED",
      entityType: "Guardian",
      entityId: guardian.id,
      metadata: { isActive: activeState },
    });
    return updated;
  });
}
