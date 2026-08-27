import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, describe, expect, it, vi } from "vitest";

import { PrismaClient } from "@/generated/prisma/client";
import { ApplicationError } from "@/lib/errors/application-error";
import type { ApplicationUser } from "@/modules/auth/types";
import {
  createCampaign,
  sendCampaign,
} from "@/modules/campaigns/services/campaign-service";
import type { NotificationProvider } from "@/modules/notifications/services/notification-delivery";
import {
  requireIsolatedTestDatabase,
  verifyIsolatedTestDatabase,
} from "../support/test-environment";

vi.mock("server-only", () => ({}));

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: requireIsolatedTestDatabase() }),
});
const suffix = randomUUID();
const ids: Record<string, string> = {};

afterAll(async () => {
  await verifyIsolatedTestDatabase();
  await prisma.$transaction(async (transaction) => {
    if (ids.campaign) {
      const recipients = await transaction.campaignRecipient.findMany({
        where: { campaignId: ids.campaign },
        select: { id: true },
      });
      const recipientIds = recipients.map(({ id }) => id);
      await transaction.notification.deleteMany({
        where: { campaignRecipientId: { in: recipientIds } },
      });
      await transaction.campaignRecipient.deleteMany({
        where: { campaignId: ids.campaign },
      });
      await transaction.auditLog.deleteMany({
        where: { entityType: "Campaign", entityId: ids.campaign },
      });
      await transaction.campaign.deleteMany({ where: { id: ids.campaign } });
    }
    if (ids.children) {
      const childIds = ids.children.split(",");
      await transaction.childGuardian.deleteMany({
        where: { childId: { in: childIds } },
      });
      await transaction.child.deleteMany({ where: { id: { in: childIds } } });
    }
    if (ids.guardians) {
      await transaction.guardian.deleteMany({
        where: { id: { in: ids.guardians.split(",") } },
      });
    }
    if (ids.users) {
      await transaction.user.deleteMany({
        where: { id: { in: ids.users.split(",") } },
      });
    }
    if (ids.communities) {
      await transaction.community.deleteMany({
        where: { id: { in: ids.communities.split(",") } },
      });
    }
    if (ids.centers) {
      await transaction.healthCenter.deleteMany({
        where: { id: { in: ids.centers.split(",") } },
      });
    }
  });
  await prisma.$disconnect();
});

describe("campaign snapshot and delivery", () => {
  it("persists mixed results, audit events, IDOR denial and idempotency", async () => {
    const fixture = await prisma.$transaction(async (transaction) => {
      const center = await transaction.healthCenter.create({
        data: { name: `Centro campaña ${suffix}` },
      });
      const otherCenter = await transaction.healthCenter.create({
        data: { name: `Centro ajeno campaña ${suffix}` },
      });
      const community = await transaction.community.create({
        data: {
          healthCenterId: center.id,
          name: `Comunidad campaña ${suffix}`,
        },
      });
      const otherCommunity = await transaction.community.create({
        data: {
          healthCenterId: otherCenter.id,
          name: `Comunidad ajena campaña ${suffix}`,
        },
      });
      const manager = await transaction.user.create({
        data: {
          authUserId: randomUUID(),
          healthCenterId: center.id,
          fullName: "Gerente ficticio",
          email: `manager-${suffix}@example.test`,
          role: "CENTER_MANAGER",
        },
      });
      const otherManager = await transaction.user.create({
        data: {
          authUserId: randomUUID(),
          healthCenterId: otherCenter.id,
          fullName: "Gerente ajeno ficticio",
          email: `other-${suffix}@example.test`,
          role: "CENTER_MANAGER",
        },
      });
      const guardianInputs = [
        { label: "sent", preferredNotificationChannel: "EMAIL" as const },
        { label: "failed", preferredNotificationChannel: "EMAIL" as const },
        { label: "skipped", preferredNotificationChannel: "WHATSAPP" as const },
      ];
      const guardians = [];
      const children = [];
      for (const input of guardianInputs) {
        const guardian = await transaction.guardian.create({
          data: {
            communityId: community.id,
            fullName: `Tutor ${input.label} ${suffix}`,
            email: `${input.label}-${suffix}@example.test`,
            preferredNotificationChannel: input.preferredNotificationChannel,
          },
        });
        const child = await transaction.child.create({
          data: {
            communityId: community.id,
            fullName: `Niño ${input.label} ${suffix}`,
            dateOfBirth: new Date("2025-01-01T00:00:00Z"),
            sex: "MALE",
          },
        });
        await transaction.childGuardian.create({
          data: { childId: child.id, guardianId: guardian.id },
        });
        guardians.push(guardian);
        children.push(child);
      }
      return {
        center,
        otherCenter,
        community,
        otherCommunity,
        manager,
        otherManager,
        guardians,
        children,
      };
    });
    ids.centers = [fixture.center.id, fixture.otherCenter.id].join(",");
    ids.communities = [fixture.community.id, fixture.otherCommunity.id].join(
      ",",
    );
    ids.users = [fixture.manager.id, fixture.otherManager.id].join(",");
    ids.guardians = fixture.guardians.map(({ id }) => id).join(",");
    ids.children = fixture.children.map(({ id }) => id).join(",");

    const manager = fixture.manager as ApplicationUser;
    const otherManager = fixture.otherManager as ApplicationUser;
    const campaign = await createCampaign(
      manager,
      {
        name: "Campaña ficticia de integración",
        subject: "Aviso operativo SCCVI",
        message: "Mensaje ficticio de seguimiento operativo.",
        communityId: fixture.community.id,
        minimumAgeYears: 0,
        maximumAgeYears: 17,
      },
      new Date("2026-08-27T12:00:00Z"),
    );
    ids.campaign = campaign.id;
    expect(
      await prisma.campaignRecipient.count({
        where: { campaignId: campaign.id },
      }),
    ).toBe(3);

    await expect(
      sendCampaign(otherManager, campaign.id),
    ).rejects.toBeInstanceOf(ApplicationError);

    const deliver = vi.fn<NotificationProvider["deliver"]>(async (message) =>
      message.destination.startsWith("failed-")
        ? { delivered: false, errorMessage: "Fallo controlado de prueba." }
        : { delivered: true, providerMessageId: `test-${suffix}` },
    );
    await sendCampaign(manager, campaign.id, { channel: "EMAIL", deliver });

    const recipients = await prisma.campaignRecipient.findMany({
      where: { campaignId: campaign.id },
      orderBy: { guardian: { fullName: "asc" } },
    });
    expect(recipients.map(({ status }) => status).sort()).toEqual([
      "FAILED",
      "SENT",
      "SKIPPED",
    ]);
    expect(deliver).toHaveBeenCalledTimes(2);
    expect(
      await prisma.notification.count({
        where: { campaignRecipient: { campaignId: campaign.id } },
      }),
    ).toBe(2);
    expect(
      await prisma.auditLog.findMany({
        where: { entityType: "Campaign", entityId: campaign.id },
        select: { action: true, metadata: true },
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "CAMPAIGN_CREATED" }),
        expect.objectContaining({ action: "CAMPAIGN_SEND_STARTED" }),
        expect.objectContaining({ action: "CAMPAIGN_FAILED" }),
      ]),
    );
    await expect(
      sendCampaign(manager, campaign.id, { channel: "EMAIL", deliver }),
    ).rejects.toBeInstanceOf(ApplicationError);
    expect(deliver).toHaveBeenCalledTimes(2);
  }, 20_000);
});
