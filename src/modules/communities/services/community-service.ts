import { ApplicationError } from "@/lib/errors/application-error";
import { activeStateSchema } from "@/lib/validation/common-schema";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import {
  communityIdSchema,
  communityInputSchema,
  communitySearchSchema,
  type CommunityInput,
  type CommunitySearch,
} from "@/modules/communities/schemas/community-schema";

export type CommunityRecord = {
  id: string;
  healthCenterId: string;
  name: string;
  location: string | null;
  estimatedFamilies: number | null;
  isActive: boolean;
  healthCenter: { name: string };
};

export interface CommunityRepository {
  healthCenterExists(id: string): Promise<boolean>;
  findById(id: string): Promise<CommunityRecord | null>;
  findDuplicate(
    healthCenterId: string,
    name: string,
    excludeId?: string,
  ): Promise<boolean>;
  list(
    filters: CommunitySearch & { allowedHealthCenterId?: string },
  ): Promise<CommunityRecord[]>;
  create(input: CommunityInput, auditUserId: string): Promise<CommunityRecord>;
  update(
    id: string,
    input: CommunityInput,
    auditUserId: string,
    changedFields: string[],
  ): Promise<CommunityRecord>;
  setActive(
    id: string,
    isActive: boolean,
    auditUserId: string,
  ): Promise<CommunityRecord>;
}

export class CommunityService {
  constructor(private readonly repository: CommunityRepository) {}

  async list(user: ApplicationUser, input: unknown) {
    authorize(user, "community:list");
    const filters = communitySearchSchema.parse(input);
    const allowedHealthCenterId =
      user.role === "ADMIN" ? undefined : (user.healthCenterId ?? "");

    if (
      allowedHealthCenterId &&
      filters.healthCenterId &&
      filters.healthCenterId !== allowedHealthCenterId
    ) {
      throw new ApplicationError("FORBIDDEN");
    }

    return this.repository.list({ ...filters, allowedHealthCenterId });
  }

  async get(user: ApplicationUser, id: string) {
    const communityId = communityIdSchema.parse(id);
    const community = await this.repository.findById(communityId);
    if (!community) throw new ApplicationError("COMMUNITY_NOT_FOUND");
    authorize(user, "community:read", {
      healthCenterId: community.healthCenterId,
    });
    return community;
  }

  async create(user: ApplicationUser, input: unknown) {
    const data = communityInputSchema.parse(input);
    authorize(user, "community:create", {
      healthCenterId: data.healthCenterId,
    });
    if (!(await this.repository.healthCenterExists(data.healthCenterId))) {
      throw new ApplicationError("HEALTH_CENTER_NOT_FOUND");
    }
    if (await this.repository.findDuplicate(data.healthCenterId, data.name)) {
      throw new ApplicationError("COMMUNITY_DUPLICATE");
    }
    return this.repository.create(data, user.id);
  }

  async update(user: ApplicationUser, id: string, input: unknown) {
    const communityId = communityIdSchema.parse(id);
    const existing = await this.repository.findById(communityId);
    if (!existing) throw new ApplicationError("COMMUNITY_NOT_FOUND");
    authorize(user, "community:update", {
      healthCenterId: existing.healthCenterId,
    });
    const data = communityInputSchema.parse(input);
    if (data.healthCenterId !== existing.healthCenterId) {
      throw new ApplicationError("FORBIDDEN");
    }
    if (
      await this.repository.findDuplicate(
        data.healthCenterId,
        data.name,
        communityId,
      )
    ) {
      throw new ApplicationError("COMMUNITY_DUPLICATE");
    }
    const changedFields = [
      existing.name !== data.name ? "name" : null,
      existing.location !== data.location ? "location" : null,
      existing.estimatedFamilies !== data.estimatedFamilies
        ? "estimatedFamilies"
        : null,
    ].filter((value): value is string => Boolean(value));
    return this.repository.update(communityId, data, user.id, changedFields);
  }

  async setActive(user: ApplicationUser, id: string, isActive: boolean) {
    const activeState = activeStateSchema.parse(isActive);
    const communityId = communityIdSchema.parse(id);
    const existing = await this.repository.findById(communityId);
    if (!existing) throw new ApplicationError("COMMUNITY_NOT_FOUND");
    authorize(user, "community:deactivate", {
      healthCenterId: existing.healthCenterId,
    });
    return this.repository.setActive(communityId, activeState, user.id);
  }
}
