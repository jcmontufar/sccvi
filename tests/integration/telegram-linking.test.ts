import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { PrismaClient } from "@/generated/prisma/client";
import type { ApplicationUser } from "@/modules/auth/types";
import {
  consumeTelegramLink,
  createTelegramLink,
  unlinkGuardianTelegram,
} from "@/modules/notifications/services/telegram-link-service";
import {
  requireIsolatedTestDatabase,
  verifyIsolatedTestDatabase,
} from "../support/test-environment";

vi.mock("server-only", () => ({}));

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: requireIsolatedTestDatabase() }),
});
const suffix = randomUUID();
const ids: Record<string, string[]> = {
  centers: [],
  communities: [],
  users: [],
  guardians: [],
};
let staff: ApplicationUser;
let otherStaff: ApplicationUser;
let guardianId: string;
const currentInstant = new Date("2026-09-19T12:00:00.000Z");

beforeAll(async () => {
  process.env.TELEGRAM_BOT_USERNAME = "SccviTestBot";
  const fixture = await prisma.$transaction(async (transaction) => {
    const center = await transaction.healthCenter.create({
      data: { name: `Centro Telegram ${suffix}` },
    });
    const otherCenter = await transaction.healthCenter.create({
      data: { name: `Centro Telegram ajeno ${suffix}` },
    });
    const community = await transaction.community.create({
      data: { healthCenterId: center.id, name: `Comunidad Telegram ${suffix}` },
    });
    const otherCommunity = await transaction.community.create({
      data: {
        healthCenterId: otherCenter.id,
        name: `Comunidad Telegram ajena ${suffix}`,
      },
    });
    const user = await transaction.user.create({
      data: {
        authUserId: randomUUID(),
        healthCenterId: center.id,
        fullName: "Personal Telegram ficticio",
        email: `staff-${suffix}@example.test`,
        role: "HEALTH_STAFF",
      },
    });
    const outsideUser = await transaction.user.create({
      data: {
        authUserId: randomUUID(),
        healthCenterId: otherCenter.id,
        fullName: "Personal Telegram ajeno ficticio",
        email: `outside-${suffix}@example.test`,
        role: "HEALTH_STAFF",
      },
    });
    const guardian = await transaction.guardian.create({
      data: {
        communityId: community.id,
        fullName: "Tutor Telegram ficticio",
        preferredNotificationChannel: "TELEGRAM",
      },
    });
    return {
      center,
      otherCenter,
      community,
      otherCommunity,
      user,
      outsideUser,
      guardian,
    };
  });
  ids.centers.push(fixture.center.id, fixture.otherCenter.id);
  ids.communities.push(fixture.community.id, fixture.otherCommunity.id);
  ids.users.push(fixture.user.id, fixture.outsideUser.id);
  ids.guardians.push(fixture.guardian.id);
  guardianId = fixture.guardian.id;
  staff = fixture.user as ApplicationUser;
  otherStaff = fixture.outsideUser as ApplicationUser;
});

afterAll(async () => {
  await verifyIsolatedTestDatabase();
  await prisma.$transaction(async (transaction) => {
    await transaction.auditLog.deleteMany({
      where: { entityType: "Guardian", entityId: { in: ids.guardians } },
    });
    await transaction.telegramLinkToken.deleteMany({
      where: { guardianId: { in: ids.guardians } },
    });
    await transaction.guardianTelegramConnection.deleteMany({
      where: { guardianId: { in: ids.guardians } },
    });
    await transaction.guardian.deleteMany({
      where: { id: { in: ids.guardians } },
    });
    await transaction.user.deleteMany({ where: { id: { in: ids.users } } });
    await transaction.community.deleteMany({
      where: { id: { in: ids.communities } },
    });
    await transaction.healthCenter.deleteMany({
      where: { id: { in: ids.centers } },
    });
  });
  await prisma.$disconnect();
});

describe("Telegram linking persistence", () => {
  it("links once, blocks replay, enforces center scope and unlinks", async () => {
    await expect(
      createTelegramLink(otherStaff, guardianId, currentInstant),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const link = await createTelegramLink(staff, guardianId, currentInstant);
    const rawToken = new URL(link.url).searchParams.get("start");
    expect(rawToken).toBeTruthy();
    await consumeTelegramLink(rawToken, "987654321", currentInstant);
    await expect(
      consumeTelegramLink(rawToken, "987654321", currentInstant),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(
      await prisma.guardianTelegramConnection.findUnique({
        where: { guardianId },
        select: { chatId: true, revokedAt: true },
      }),
    ).toEqual({ chatId: "987654321", revokedAt: null });
    await unlinkGuardianTelegram(staff, guardianId, currentInstant);
    expect(
      await prisma.guardianTelegramConnection.findUnique({
        where: { guardianId },
        select: { chatId: true, revokedAt: true },
      }),
    ).toEqual({ chatId: null, revokedAt: currentInstant });
  });
});
