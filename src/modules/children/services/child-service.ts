import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { ApplicationError } from "@/lib/errors/application-error";
import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import {
  childGuardianInputSchema,
  childIdSchema,
  childInputSchema,
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
  const data = childInputSchema.parse(input);
  await validateCommunity(user, data.communityId, "child:create");
  return getPrisma().child.create({
    data: {
      ...data,
      dateOfBirth: new Date(`${data.dateOfBirth}T00:00:00.000Z`),
    },
    select: childSelect,
  });
}

export async function updateChild(
  user: ApplicationUser,
  id: string,
  input: unknown,
) {
  const child = await getChild(user, id);
  authorize(user, "child:update", childAccessResource(child));
  const data = childInputSchema.parse(input);
  await validateCommunity(user, data.communityId, "child:update");
  return getPrisma().child.update({
    where: { id: child.id },
    data: {
      ...data,
      dateOfBirth: new Date(`${data.dateOfBirth}T00:00:00.000Z`),
    },
    select: childSelect,
  });
}

export async function setChildActive(
  user: ApplicationUser,
  id: string,
  isActive: boolean,
) {
  const child = await getChild(user, id);
  authorize(user, "child:deactivate", childAccessResource(child));
  return getPrisma().child.update({
    where: { id: child.id },
    data: { isActive },
    select: childSelect,
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
  return getPrisma().childGuardian.create({
    data: { childId: child.id, ...data },
    select: { id: true },
  });
}
