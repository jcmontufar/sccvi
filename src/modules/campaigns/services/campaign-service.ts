import "server-only";

import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import { ApplicationError } from "@/lib/errors/application-error";
import {
  campaignIdSchema,
  campaignInputSchema,
  type CampaignSegmentation,
} from "@/modules/campaigns/schemas/campaign-schema";
import { buildAgeDateRange } from "@/modules/campaigns/services/campaign-segmentation";

export async function listCampaigns(user: ApplicationUser) {
  authorize(user, "campaign:list", { healthCenterId: user.healthCenterId });
  return getPrisma().campaign.findMany({
    where:
      user.role === "ADMIN"
        ? undefined
        : { createdBy: { healthCenterId: user.healthCenterId ?? "" } },
    include: {
      _count: { select: { recipients: true } },
      createdBy: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCampaign(user: ApplicationUser, id: string) {
  const campaign = await getPrisma().campaign.findUnique({
    where: { id: campaignIdSchema.parse(id) },
    include: {
      createdBy: { select: { fullName: true, healthCenterId: true } },
      recipients: {
        include: { guardian: { select: { fullName: true, email: true } } },
        orderBy: { guardian: { fullName: "asc" } },
      },
    },
  });
  if (!campaign) throw new ApplicationError("CAMPAIGN_NOT_FOUND");
  authorize(user, "campaign:read", {
    healthCenterId: campaign.createdBy.healthCenterId,
  });
  return campaign;
}

export async function createCampaign(user: ApplicationUser, input: unknown) {
  const data = campaignInputSchema.parse(input);
  authorize(user, "campaign:create", { healthCenterId: user.healthCenterId });
  const segmentation: CampaignSegmentation = {
    communityId: data.communityId || undefined,
    minimumAgeYears: data.minimumAgeYears,
    maximumAgeYears: data.maximumAgeYears,
  };
  if (segmentation.communityId) {
    const community = await getPrisma().community.findUnique({
      where: { id: segmentation.communityId },
      select: { healthCenterId: true, isActive: true },
    });
    if (!community?.isActive) throw new ApplicationError("COMMUNITY_NOT_FOUND");
    authorize(user, "campaign:create", {
      healthCenterId: community.healthCenterId,
    });
  }
  const dateRange = buildAgeDateRange(segmentation);
  const guardians = await getPrisma().guardian.findMany({
    where: {
      isActive: true,
      email: { not: null },
      communityId: segmentation.communityId,
      community:
        user.role === "ADMIN"
          ? undefined
          : { healthCenterId: user.healthCenterId ?? "" },
      childGuardians: {
        some: { child: { isActive: true, dateOfBirth: dateRange } },
      },
    },
    select: { id: true },
  });
  return getPrisma().$transaction(async (transaction) => {
    const campaign = await transaction.campaign.create({
      data: {
        createdByUserId: user.id,
        name: data.name,
        subject: data.subject,
        message: data.message,
        segmentation,
      },
    });
    if (guardians.length) {
      await transaction.campaignRecipient.createMany({
        data: guardians.map(({ id }) => ({
          campaignId: campaign.id,
          guardianId: id,
        })),
        skipDuplicates: true,
      });
    }
    return campaign;
  });
}
