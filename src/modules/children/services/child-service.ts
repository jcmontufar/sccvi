import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { ApplicationError } from "@/lib/errors/application-error";
import { getPrisma } from "@/lib/prisma";
import { activeStateSchema } from "@/lib/validation/common-schema";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import {
  childGuardianInputSchema,
  childIdSchema,
  createChildInputSchema,
  childSearchSchema,
} from "@/modules/children/schemas/child-schema";
import { validateChildGuardianAssociation } from "@/modules/children/services/child-guardian-rules";

const childSelect = {
  id: true,
  communityId: true,
  fullName: true,
  dateOfBirth: true,
  sex: true,
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
      id: true,
      relationshipType: true,
      isPrimary: true,
      guardian: {
        select: {
          id: true,
          userId: true,
          fullName: true,
          isActive: true,
        },
      },
    },
    orderBy: [{ isPrimary: "desc" }, { guardian: { fullName: "asc" } }],
  },
} satisfies Prisma.ChildSelect;

export type ChildWithAccess = Awaited<ReturnType<typeof findChild>>;

async function findChild(id: string) {
  return getPrisma().child.findUnique({ where: { id }, select: childSelect });
}

export function childAccessResource(
  child: NonNullable<Awaited<ReturnType<typeof findChild>>>,
) {
  return {
    healthCenterId: child.community.healthCenterId,
    guardianUserIds: child.childGuardians.flatMap(({ guardian }) =>
      guardian.userId && guardian.isActive ? [guardian.userId] : [],
    ),
  };
}

async function validateCommunity(
  user: ApplicationUser,
  communityId: string,
  action: "child:create" | "child:update",
) {
  const community = await getPrisma().community.findUnique({
    where: { id: communityId },
    select: { healthCenterId: true, isActive: true },
  });
  if (!community?.isActive) throw new ApplicationError("COMMUNITY_NOT_FOUND");
  authorize(user, action, { healthCenterId: community.healthCenterId });
  return community;
}

export async function listChildren(user: ApplicationUser, input: unknown) {
  authorize(user, "child:list", {
    guardianUserIds: user.role === "GUARDIAN" ? [user.id] : undefined,
  });
  const filters = childSearchSchema.parse(input);
  return getPrisma().child.findMany({
    where: {
      community: {
        healthCenterId:
          user.role === "ADMIN" || user.role === "GUARDIAN"
            ? undefined
            : (user.healthCenterId ?? ""),
      },
      childGuardians:
        user.role === "GUARDIAN"
          ? { some: { guardian: { userId: user.id, isActive: true } } }
          : undefined,
      communityId: filters.communityId || undefined,
      isActive:
        filters.status === "all" ? undefined : filters.status === "active",
      fullName: filters.search
        ? { contains: filters.search, mode: "insensitive" }
        : undefined,
    },
    select: childSelect,
    orderBy: { fullName: "asc" },
    take: 100,
  });
}

export async function getChild(user: ApplicationUser, id: string) {
  const childId = childIdSchema.parse(id);
  const child = await findChild(childId);
  if (!child) throw new ApplicationError("CHILD_NOT_FOUND");
  authorize(user, "child:read", childAccessResource(child));
  return child;
}

export async function createChild(user: ApplicationUser, input: unknown) {
  const data = createChildInputSchema().parse(input);
  await validateCommunity(user, data.communityId, "child:create");
  return getPrisma().$transaction(async (transaction) => {
    const child = await transaction.child.create({
      data: {
        ...data,
        dateOfBirth: new Date(`${data.dateOfBirth}T00:00:00.000Z`),
      },
      select: childSelect,
    });
    await recordAuditEvent(transaction, {
      userId: user.id,
      action: "CHILD_CREATED",
      entityType: "Child",
      entityId: child.id,
      metadata: { communityId: child.communityId },
    });
    return child;
  });
}

export async function updateChild(
  user: ApplicationUser,
  id: string,
  input: unknown,
) {
  const child = await getChild(user, id);
  authorize(user, "child:update", childAccessResource(child));
  const data = createChildInputSchema().parse(input);
  await validateCommunity(user, data.communityId, "child:update");
  const changedFields = [
    child.communityId !== data.communityId ? "communityId" : null,
    child.fullName !== data.fullName ? "fullName" : null,
    child.dateOfBirth.toISOString().slice(0, 10) !== data.dateOfBirth
      ? "dateOfBirth"
      : null,
    child.sex !== data.sex ? "sex" : null,
  ].filter((value): value is string => Boolean(value));
  return getPrisma().$transaction(async (transaction) => {
    const updated = await transaction.child.update({
      where: { id: child.id },
      data: {
        ...data,
        dateOfBirth: new Date(`${data.dateOfBirth}T00:00:00.000Z`),
      },
      select: childSelect,
    });
    await recordAuditEvent(transaction, {
      userId: user.id,
      action: "CHILD_UPDATED",
      entityType: "Child",
      entityId: child.id,
      metadata: { changedFields },
    });
    return updated;
  });
}

export async function setChildActive(
  user: ApplicationUser,
  id: string,
  isActive: boolean,
) {
  const child = await getChild(user, id);
  authorize(user, "child:deactivate", childAccessResource(child));
  const activeState = activeStateSchema.parse(isActive);
  return getPrisma().$transaction(async (transaction) => {
    const updated = await transaction.child.update({
      where: { id: child.id },
      data: { isActive: activeState },
      select: childSelect,
    });
    await recordAuditEvent(transaction, {
      userId: user.id,
      action: "CHILD_STATUS_CHANGED",
      entityType: "Child",
      entityId: child.id,
      metadata: { isActive: activeState },
    });
    return updated;
  });
}

export async function associateGuardian(
  user: ApplicationUser,
  childIdValue: string,
  input: unknown,
) {
  const child = await getChild(user, childIdValue);
  authorize(user, "child:manage-guardians", childAccessResource(child));
  if (!child.isActive) throw new ApplicationError("VALIDATION_ERROR");
  const data = childGuardianInputSchema.parse(input);
  const guardian = await getPrisma().guardian.findUnique({
    where: { id: data.guardianId },
    select: {
      id: true,
      isActive: true,
      community: { select: { healthCenterId: true } },
    },
  });
  if (!guardian?.isActive) throw new ApplicationError("GUARDIAN_NOT_FOUND");
  const duplicate = await getPrisma().childGuardian.findUnique({
    where: {
      childId_guardianId: { childId: child.id, guardianId: guardian.id },
    },
    select: { id: true },
  });
  validateChildGuardianAssociation({
    duplicate: Boolean(duplicate),
    childHealthCenterId: child.community.healthCenterId,
    guardianHealthCenterId: guardian.community.healthCenterId,
  });
  return getPrisma().$transaction(async (transaction) => {
    const association = await transaction.childGuardian.create({
      data: { childId: child.id, ...data },
      select: { id: true },
    });
    await recordAuditEvent(transaction, {
      userId: user.id,
      action: "CHILD_GUARDIAN_ASSOCIATED",
      entityType: "ChildGuardian",
      entityId: association.id,
      metadata: { childId: child.id, guardianId: guardian.id },
    });
    return association;
  });
}
