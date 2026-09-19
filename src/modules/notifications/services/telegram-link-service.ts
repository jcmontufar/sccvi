import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { z } from "zod";

import { ApplicationError } from "@/lib/errors/application-error";
import { getServerEnvironment } from "@/lib/env/server-env";
import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import { getGuardian } from "@/modules/guardians/services/guardian-service";

const TOKEN_TTL_MS = 15 * 60 * 1000;
const LINK_RATE_LIMIT = 3;
const rawTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const chatIdSchema = z.string().regex(/^-?\d{1,20}$/);

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function configuredBotUsername() {
  const username = getServerEnvironment().TELEGRAM_BOT_USERNAME?.replace(
    /^@/,
    "",
  );
  if (!username || !/^[A-Za-z0-9_]{5,32}$/.test(username)) {
    throw new ApplicationError("VALIDATION_ERROR");
  }
  return username;
}

export async function createTelegramLink(
  user: ApplicationUser,
  guardianId: string,
  currentInstant = new Date(),
) {
  const guardian = await getGuardian(user, guardianId);
  authorize(user, "guardian:update", {
    healthCenterId: guardian.community.healthCenterId,
  });
  const botUsername = configuredBotUsername();
  const oneHourAgo = new Date(currentInstant.getTime() - 60 * 60 * 1000);
  const recent = await getPrisma().telegramLinkToken.count({
    where: { guardianId: guardian.id, createdAt: { gte: oneHourAgo } },
  });
  if (recent >= LINK_RATE_LIMIT) throw new ApplicationError("VALIDATION_ERROR");

  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(currentInstant.getTime() + TOKEN_TTL_MS);
  const token = await getPrisma().$transaction(async (transaction) => {
    await transaction.telegramLinkToken.updateMany({
      where: {
        guardianId: guardian.id,
        consumedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: currentInstant },
    });
    const created = await transaction.telegramLinkToken.create({
      data: {
        guardianId: guardian.id,
        createdByUserId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt,
      },
    });
    await recordAuditEvent(transaction, {
      userId: user.id,
      action: "TELEGRAM_LINK_REQUESTED",
      entityType: "Guardian",
      entityId: guardian.id,
      metadata: { linkTokenId: created.id, expiresAt: expiresAt.toISOString() },
    });
    return created;
  });
  return {
    url: `https://t.me/${botUsername}?start=${rawToken}`,
    expiresAt,
    tokenId: token.id,
  };
}

export async function consumeTelegramLink(
  rawTokenInput: unknown,
  chatIdInput: unknown,
  currentInstant = new Date(),
) {
  const rawToken = rawTokenSchema.parse(rawTokenInput);
  const chatId = chatIdSchema.parse(chatIdInput);
  return getPrisma().$transaction(async (transaction) => {
    const token = await transaction.telegramLinkToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      select: {
        id: true,
        guardianId: true,
        expiresAt: true,
        consumedAt: true,
        revokedAt: true,
      },
    });
    if (
      !token ||
      token.consumedAt ||
      token.revokedAt ||
      token.expiresAt <= currentInstant
    ) {
      throw new ApplicationError("VALIDATION_ERROR");
    }
    const chatConnection =
      await transaction.guardianTelegramConnection.findUnique({
        where: { chatId },
        select: { guardianId: true, revokedAt: true },
      });
    if (
      chatConnection &&
      (!chatConnection.revokedAt ||
        chatConnection.guardianId !== token.guardianId)
    ) {
      throw new ApplicationError("VALIDATION_ERROR");
    }
    const consumed = await transaction.telegramLinkToken.updateMany({
      where: {
        id: token.id,
        consumedAt: null,
        revokedAt: null,
        expiresAt: { gt: currentInstant },
      },
      data: { consumedAt: currentInstant },
    });
    if (consumed.count !== 1) throw new ApplicationError("VALIDATION_ERROR");
    const connection = await transaction.guardianTelegramConnection.upsert({
      where: { guardianId: token.guardianId },
      create: {
        guardianId: token.guardianId,
        chatId,
        linkedAt: currentInstant,
        consentedAt: currentInstant,
      },
      update: {
        chatId,
        linkedAt: currentInstant,
        consentedAt: currentInstant,
        revokedAt: null,
      },
    });
    await recordAuditEvent(transaction, {
      userId: null,
      action: "TELEGRAM_LINKED",
      entityType: "Guardian",
      entityId: token.guardianId,
      metadata: { connectionId: connection.id, linkTokenId: token.id },
    });
    return { guardianId: token.guardianId };
  });
}

export async function unlinkGuardianTelegram(
  user: ApplicationUser,
  guardianId: string,
  currentInstant = new Date(),
) {
  const guardian = await getGuardian(user, guardianId);
  authorize(user, "guardian:update", {
    healthCenterId: guardian.community.healthCenterId,
  });
  return revokeTelegramConnection(guardian.id, user.id, currentInstant);
}

export async function unlinkTelegramByChat(
  chatIdInput: unknown,
  currentInstant = new Date(),
) {
  const chatId = chatIdSchema.parse(chatIdInput);
  const connection = await getPrisma().guardianTelegramConnection.findUnique({
    where: { chatId },
    select: { guardianId: true, revokedAt: true },
  });
  if (!connection || connection.revokedAt) return false;
  await revokeTelegramConnection(connection.guardianId, null, currentInstant);
  return true;
}

async function revokeTelegramConnection(
  guardianId: string,
  userId: string | null,
  currentInstant: Date,
) {
  return getPrisma().$transaction(async (transaction) => {
    const updated = await transaction.guardianTelegramConnection.updateMany({
      where: { guardianId, chatId: { not: null }, revokedAt: null },
      data: { chatId: null, revokedAt: currentInstant },
    });
    await transaction.telegramLinkToken.updateMany({
      where: { guardianId, consumedAt: null, revokedAt: null },
      data: { revokedAt: currentInstant },
    });
    if (updated.count) {
      await recordAuditEvent(transaction, {
        userId,
        action: "TELEGRAM_UNLINKED",
        entityType: "Guardian",
        entityId: guardianId,
      });
    }
    return updated.count === 1;
  });
}
