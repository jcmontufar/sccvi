import "server-only";

import type { CampaignRecipientStatus } from "@/generated/prisma/enums";
import { getCurrentBusinessDate } from "@/lib/date/business-date";
import { ApplicationError } from "@/lib/errors/application-error";
import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import {
  campaignIdSchema,
  campaignInputSchema,
  type CampaignSegmentation,
} from "@/modules/campaigns/schemas/campaign-schema";
import {
  buildAgeDateRange,
  deduplicateGuardianIds,
  matchesVaccinationSegmentation,
} from "@/modules/campaigns/services/campaign-segmentation";
import { selectGuardianNotificationRecipient } from "@/modules/notifications/services/notification-recipient-policy";
import { deliverQueuedNotification } from "@/modules/notifications/services/notification-service";
import { createNotificationProviderRegistry } from "@/modules/notifications/services/provider-registry";
import type { NotificationProviderSource } from "@/modules/notifications/services/provider-registry";
import { listChildVaccinationStatuses } from "@/modules/vaccination/services/vaccination-service";

const campaignInclude = {
  createdBy: { select: { fullName: true, healthCenterId: true } },
  recipients: {
    include: {
      guardian: { select: { fullName: true, email: true } },
      notifications: {
        select: { channel: true, status: true, errorMessage: true },
      },
    },
    orderBy: { guardian: { fullName: "asc" as const } },
  },
};

export function resolveCampaignDeliveryRecipient(input: {
  guardianActive: boolean;
  email: string | null;
  telegramChatId?: string | null;
  telegramRevokedAt?: Date | null;
  preferredChannel: string | null;
  guardianHealthCenterId: string;
  campaignHealthCenterId: string | null;
  senderRole: ApplicationUser["role"];
}) {
  if (
    input.senderRole !== "ADMIN" &&
    input.guardianHealthCenterId !== input.campaignHealthCenterId
  ) {
    return null;
  }
  return selectGuardianNotificationRecipient({
    id: "campaign-recipient",
    isActive: input.guardianActive,
    email: input.email,
    preferredNotificationChannel: input.preferredChannel as
      "EMAIL" | "TELEGRAM" | "WHATSAPP" | null,
    telegramConnection: input.telegramChatId
      ? {
          chatId: input.telegramChatId,
          revokedAt: input.telegramRevokedAt ?? null,
        }
      : null,
  });
}

export function isCampaignDeliveryEligible(
  input: Parameters<typeof resolveCampaignDeliveryRecipient>[0],
) {
  return Boolean(resolveCampaignDeliveryRecipient(input));
}

export function deriveCampaignResult(
  statuses: readonly CampaignRecipientStatus[],
) {
  const summary = statuses.reduce(
    (result, status) => ({ ...result, [status]: result[status] + 1 }),
    { PENDING: 0, SENT: 0, FAILED: 0, SKIPPED: 0 },
  );
  return {
    summary,
    status: summary.FAILED > 0 ? ("FAILED" as const) : ("COMPLETED" as const),
  };
}

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
    include: campaignInclude,
  });
  if (!campaign) throw new ApplicationError("CAMPAIGN_NOT_FOUND");
  authorize(user, "campaign:read", {
    healthCenterId: campaign.createdBy.healthCenterId,
  });
  return campaign;
}

export async function listCampaignVaccinationDoses(
  user: ApplicationUser,
  currentInstant = new Date(),
) {
  authorize(user, "campaign:create", { healthCenterId: user.healthCenterId });
  const businessDate = getCurrentBusinessDate({ currentInstant });
  const at = new Date(`${businessDate}T00:00:00.000Z`);
  const version = await getPrisma().vaccineScheduleVersion.findFirst({
    where: {
      isActive: true,
      effectiveFrom: { lte: at },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: at } }],
    },
    orderBy: { effectiveFrom: "desc" },
    include: {
      schedules: {
        where: { isActive: true, doseCode: { not: null } },
        include: { vaccine: { select: { name: true } } },
        orderBy: [
          { recommendedAgeMonths: "asc" },
          { recommendedAgeDays: "asc" },
          { vaccine: { name: "asc" } },
        ],
      },
    },
  });
  if (!version) return null;
  return {
    code: version.code,
    name: version.name,
    doses: version.schedules.map((schedule) => ({
      code: schedule.doseCode!,
      label: `${schedule.vaccine.name} — ${schedule.doseName ?? `Dosis ${schedule.doseNumber}`}`,
    })),
  };
}

async function resolveCampaignGuardianIds(
  user: ApplicationUser,
  segmentation: CampaignSegmentation,
  currentInstant: Date,
) {
  const dateRange = buildAgeDateRange(segmentation, currentInstant);
  const guardians = await getPrisma().guardian.findMany({
    where: {
      isActive: true,
      communityId: segmentation.communityId || undefined,
      community:
        user.role === "ADMIN"
          ? undefined
          : { healthCenterId: user.healthCenterId ?? "" },
      childGuardians: {
        some: { child: { isActive: true, dateOfBirth: dateRange } },
      },
    },
    select: {
      id: true,
      childGuardians: {
        where: { child: { isActive: true, dateOfBirth: dateRange } },
        select: { childId: true },
      },
    },
  });
  if (!segmentation.doseCode) return guardians.map(({ id }) => id);

  const matches: string[] = [];
  for (const guardian of guardians) {
    for (const { childId } of guardian.childGuardians) {
      const result = await listChildVaccinationStatuses(
        user,
        childId,
        currentInstant,
      );
      if (
        matchesVaccinationSegmentation(
          segmentation,
          result.version.code,
          result.doses,
        )
      ) {
        matches.push(guardian.id);
        break;
      }
    }
  }
  return matches;
}

export async function createCampaign(
  user: ApplicationUser,
  input: unknown,
  currentInstant = new Date(),
) {
  const data = campaignInputSchema.parse(input);
  authorize(user, "campaign:create", { healthCenterId: user.healthCenterId });
  const segmentation: CampaignSegmentation = {
    communityId: data.communityId || undefined,
    minimumAgeYears: data.minimumAgeYears,
    maximumAgeYears: data.maximumAgeYears,
    scheduleVersionCode: data.doseCode
      ? data.scheduleVersionCode || undefined
      : undefined,
    doseCode: data.doseCode || undefined,
    doseStatus: data.doseStatus,
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
  if (segmentation.scheduleVersionCode) {
    const available = await listCampaignVaccinationDoses(user, currentInstant);
    if (
      available?.code !== segmentation.scheduleVersionCode ||
      !available.doses.some(({ code }) => code === segmentation.doseCode)
    ) {
      throw new ApplicationError("VACCINE_SCHEDULE_NOT_FOUND");
    }
  }
  const guardianIds = deduplicateGuardianIds(
    await resolveCampaignGuardianIds(user, segmentation, currentInstant),
  );
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
    if (guardianIds.length) {
      await transaction.campaignRecipient.createMany({
        data: guardianIds.map((guardianId) => ({
          campaignId: campaign.id,
          guardianId,
        })),
        skipDuplicates: true,
      });
    }
    await recordAuditEvent(transaction, {
      userId: user.id,
      action: "CAMPAIGN_CREATED",
      entityType: "Campaign",
      entityId: campaign.id,
      metadata: { recipientCount: guardianIds.length, segmentation },
    });
    return campaign;
  });
}

export async function sendCampaign(
  user: ApplicationUser,
  id: string,
  providerSource: NotificationProviderSource = createNotificationProviderRegistry(),
) {
  const campaignId = campaignIdSchema.parse(id);
  const campaign = await getPrisma().campaign.findUnique({
    where: { id: campaignId },
    include: {
      createdBy: { select: { healthCenterId: true } },
      recipients: {
        include: {
          guardian: {
            include: {
              community: { select: { healthCenterId: true } },
              telegramConnection: true,
            },
          },
        },
      },
    },
  });
  if (!campaign) throw new ApplicationError("CAMPAIGN_NOT_FOUND");
  authorize(user, "campaign:send", {
    healthCenterId: campaign.createdBy.healthCenterId,
  });

  const claimed = await getPrisma().$transaction(async (transaction) => {
    const result = await transaction.campaign.updateMany({
      where: { id: campaign.id, status: "DRAFT" },
      data: { status: "PROCESSING", startedAt: new Date() },
    });
    if (result.count !== 1) return false;
    await recordAuditEvent(transaction, {
      userId: user.id,
      action: "CAMPAIGN_SEND_STARTED",
      entityType: "Campaign",
      entityId: campaign.id,
      metadata: { recipientCount: campaign.recipients.length },
    });
    return true;
  });
  if (!claimed) throw new ApplicationError("VALIDATION_ERROR");

  try {
    const statuses: CampaignRecipientStatus[] = [];
    for (const recipient of campaign.recipients) {
      const recipientDestination = resolveCampaignDeliveryRecipient({
        guardianActive: recipient.guardian.isActive,
        email: recipient.guardian.email,
        telegramChatId: recipient.guardian.telegramConnection?.chatId,
        telegramRevokedAt: recipient.guardian.telegramConnection?.revokedAt,
        preferredChannel: recipient.guardian.preferredNotificationChannel,
        guardianHealthCenterId: recipient.guardian.community.healthCenterId,
        campaignHealthCenterId: campaign.createdBy.healthCenterId,
        senderRole: user.role,
      });
      if (!recipientDestination) {
        await getPrisma().campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: "SKIPPED" },
        });
        statuses.push("SKIPPED");
        continue;
      }

      const notification = await getPrisma().notification.upsert({
        where: {
          campaignRecipientId_channel: {
            campaignRecipientId: recipient.id,
            channel: recipientDestination.channel,
          },
        },
        update: {},
        create: {
          guardianId: recipient.guardian.id,
          campaignRecipientId: recipient.id,
          channel: recipientDestination.channel,
          destination: recipientDestination.destination,
          subject: campaign.subject,
          message: campaign.message,
          status: "PENDING",
        },
      });
      const delivered =
        notification.status === "PENDING"
          ? await deliverQueuedNotification(
              user,
              notification.id,
              providerSource,
            )
          : notification;
      const recipientStatus = delivered.status === "SENT" ? "SENT" : "FAILED";
      await getPrisma().campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: recipientStatus },
      });
      statuses.push(recipientStatus);
    }

    const result = deriveCampaignResult(statuses);
    return getPrisma().$transaction(async (transaction) => {
      const completed = await transaction.campaign.update({
        where: { id: campaign.id },
        data: { status: result.status, completedAt: new Date() },
      });
      await recordAuditEvent(transaction, {
        userId: user.id,
        action:
          result.status === "COMPLETED"
            ? "CAMPAIGN_COMPLETED"
            : "CAMPAIGN_FAILED",
        entityType: "Campaign",
        entityId: campaign.id,
        metadata: result.summary,
      });
      return completed;
    });
  } catch (error) {
    await getPrisma().$transaction(async (transaction) => {
      await transaction.campaign.update({
        where: { id: campaign.id },
        data: { status: "FAILED", completedAt: new Date() },
      });
      await recordAuditEvent(transaction, {
        userId: user.id,
        action: "CAMPAIGN_FAILED",
        entityType: "Campaign",
        entityId: campaign.id,
        metadata: { recipientCount: campaign.recipients.length },
      });
    });
    throw error;
  }
}
