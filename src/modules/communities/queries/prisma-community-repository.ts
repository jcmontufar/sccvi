import "server-only";

import { getPrisma } from "@/lib/prisma";
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
  create(input) {
    return getPrisma().community.create({
      data: input,
      select: communitySelect,
    });
  },
  update(id, input) {
    return getPrisma().community.update({
      where: { id },
      data: input,
      select: communitySelect,
    });
  },
  setActive(id, isActive) {
    return getPrisma().community.update({
      where: { id },
      data: { isActive },
      select: communitySelect,
    });
  },
};

export const communityService = new CommunityService(prismaCommunityRepository);
