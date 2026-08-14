import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "@/lib/errors/application-error";
import type { ApplicationUser } from "@/modules/auth/types";
import {
  CommunityService,
  type CommunityRecord,
  type CommunityRepository,
} from "@/modules/communities/services/community-service";

const centerA = "11111111-1111-4111-8111-111111111111";
const centerB = "22222222-2222-4222-8222-222222222222";
const communityId = "33333333-3333-4333-8333-333333333333";

const manager: ApplicationUser = {
  id: "44444444-4444-4444-8444-444444444444",
  authUserId: "55555555-5555-4555-8555-555555555555",
  healthCenterId: centerA,
  fullName: "Gestora de prueba",
  email: "gestora@example.test",
  role: "CENTER_MANAGER",
  isActive: true,
};

const community: CommunityRecord = {
  id: communityId,
  healthCenterId: centerA,
  name: "El Rosario",
  location: null,
  estimatedFamilies: 80,
  isActive: true,
  healthCenter: { name: "Centro de prueba" },
};

function repository(): CommunityRepository {
  return {
    healthCenterExists: vi.fn().mockResolvedValue(true),
    findById: vi.fn().mockResolvedValue(community),
    findDuplicate: vi.fn().mockResolvedValue(false),
    list: vi.fn().mockResolvedValue([community]),
    create: vi.fn().mockResolvedValue(community),
    update: vi.fn().mockResolvedValue(community),
    setActive: vi.fn().mockResolvedValue({ ...community, isActive: false }),
  };
}

describe("CommunityService", () => {
  let repo: CommunityRepository;
  let service: CommunityService;

  beforeEach(() => {
    repo = repository();
    service = new CommunityService(repo);
  });

  it("creates a validated community in the manager's center", async () => {
    await service.create(manager, {
      healthCenterId: centerA,
      name: "  El Rosario  ",
      location: "",
      estimatedFamilies: "80",
    });
    expect(repo.create).toHaveBeenCalledWith({
      healthCenterId: centerA,
      name: "El Rosario",
      location: null,
      estimatedFamilies: 80,
    });
  });

  it("prevents duplicate communities in the same center", async () => {
    vi.mocked(repo.findDuplicate).mockResolvedValue(true);
    await expect(
      service.create(manager, {
        healthCenterId: centerA,
        name: "El Rosario",
        location: "",
        estimatedFamilies: "",
      }),
    ).rejects.toMatchObject({ code: "COMMUNITY_DUPLICATE" });
  });

  it("rejects a cross-center create even when the browser supplies that ID", async () => {
    await expect(
      service.create(manager, {
        healthCenterId: centerB,
        name: "Otra comunidad",
        location: "",
        estimatedFamilies: "",
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("rejects moving a community to another center", async () => {
    await expect(
      service.update(manager, communityId, {
        healthCenterId: centerB,
        name: "El Rosario",
        location: "",
        estimatedFamilies: "80",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("deactivates instead of deleting", async () => {
    await service.setActive(manager, communityId, false);
    expect(repo.setActive).toHaveBeenCalledWith(communityId, false);
  });

  it("rejects invalid family estimates", async () => {
    await expect(
      service.create(manager, {
        healthCenterId: centerA,
        name: "Comunidad válida",
        location: "",
        estimatedFamilies: "-1",
      }),
    ).rejects.toBeDefined();
  });
});
