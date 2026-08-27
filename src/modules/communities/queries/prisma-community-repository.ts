import "server-only";

import { getPrisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import {
  CommunityService,
  type CommunityRepository,
} from "@/modules/communities/services/community-service";

const communitySelect = {
  id: true,
  healthCenterId: true,
  name: true,
  location: true,
  estimatedFamilies: true,
  isActive: true,
  healthCenter: { select: { name: true } },
} as const;

export const prismaCommunityRepository: CommunityRepository = {
  async healthCenterExists(id) {
    return Boolean(
      await getPrisma().healthCenter.findFirst({
        where: { id, isActive: true },
        select: { id: true },
      }),
    );
  },
  findById(id) {
    return getPrisma().community.findUnique({
      where: { id },
      select: communitySelect,
    });
  },
  async findDuplicate(healthCenterId, name, excludeId) {
    return Boolean(
      await getPrisma().community.findFirst({
        where: {
          healthCenterId,
          name,
          id: excludeId ? { not: excludeId } : undefined,
        },
        select: { id: true },
      }),
    );
  },
  list(filters) {
    const healthCenterId =
      filters.allowedHealthCenterId || filters.healthCenterId || undefined;
    return getPrisma().community.findMany({
      where: {
        healthCenterId,
        isActive:
          filters.status === "all" ? undefined : filters.status === "active",
        name: filters.search
          ? { contains: filters.search, mode: "insensitive" }
          : undefined,
      },
      select: communitySelect,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      take: 100,
    });
  },
  create(input, auditUserId) {
    return getPrisma().$transaction(async (transaction) => {
      const community = await transaction.community.create({
        data: input,
        select: communitySelect,
      });
      await recordAuditEvent(transaction, {
        userId: auditUserId,
        action: "COMMUNITY_CREATED",
        entityType: "Community",
        entityId: community.id,
        metadata: { healthCenterId: community.healthCenterId },
      });
      return community;
    });
  },
  update(id, input, auditUserId, changedFields) {
    return getPrisma().$transaction(async (transaction) => {
      const community = await transaction.community.update({
        where: { id },
        data: input,
        select: communitySelect,
      });
      await recordAuditEvent(transaction, {
        userId: auditUserId,
        action: "COMMUNITY_UPDATED",
        entityType: "Community",
        entityId: community.id,
        metadata: { changedFields },
      });
      return community;
    });
  },
  setActive(id, isActive, auditUserId) {
    return getPrisma().$transaction(async (transaction) => {
      const community = await transaction.community.update({
        where: { id },
        data: { isActive },
        select: communitySelect,
      });
      await recordAuditEvent(transaction, {
        userId: auditUserId,
        action: "COMMUNITY_STATUS_CHANGED",
        entityType: "Community",
        entityId: community.id,
        metadata: { isActive },
      });
      return community;
    });
  },
};

export const communityService = new CommunityService(prismaCommunityRepository);
