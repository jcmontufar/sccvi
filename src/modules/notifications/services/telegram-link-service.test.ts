import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApplicationUser } from "@/modules/auth/types";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server-env", () => ({
  getServerEnvironment: () => ({ TELEGRAM_BOT_USERNAME: "SccviTestBot" }),
}));
const mocks = vi.hoisted(() => {
  const transaction = {
    telegramLinkToken: {
      updateMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    guardianTelegramConnection: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  return {
    getGuardian: vi.fn(),
    transaction,
    prisma: {
      telegramLinkToken: { count: vi.fn() },
      guardianTelegramConnection: { findUnique: vi.fn() },
      $transaction: vi.fn(),
    },
  };
});
vi.mock("@/modules/guardians/services/guardian-service", () => ({
  getGuardian: mocks.getGuardian,
}));
vi.mock("@/modules/audit/services/audit-service", () => ({
  recordAuditEvent: vi.fn(),
}));

const { prisma, transaction } = mocks;
vi.mock("@/lib/prisma", () => ({ getPrisma: () => mocks.prisma }));

import {
  consumeTelegramLink,
  createTelegramLink,
} from "@/modules/notifications/services/telegram-link-service";

const staff: ApplicationUser = {
  id: "11111111-1111-4111-8111-111111111111",
  authUserId: "22222222-2222-4222-8222-222222222222",
  healthCenterId: "center-a",
  fullName: "Personal ficticio",
  email: "staff@example.test",
  role: "HEALTH_STAFF",
  isActive: true,
};
const currentInstant = new Date("2026-09-19T12:00:00.000Z");
const validRawToken = "a".repeat(43);

describe("Telegram link service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );
    mocks.getGuardian.mockResolvedValue({
      id: "guardian-1",
      community: { healthCenterId: "center-a" },
    });
    prisma.telegramLinkToken.count.mockResolvedValue(0);
    transaction.telegramLinkToken.updateMany.mockResolvedValue({ count: 1 });
    transaction.telegramLinkToken.create.mockResolvedValue({ id: "token-1" });
    transaction.guardianTelegramConnection.findUnique.mockResolvedValue(null);
    transaction.guardianTelegramConnection.upsert.mockResolvedValue({
      id: "connection-1",
    });
  });

  it("creates a 256-bit, hashed, 15-minute, single active link", async () => {
    const link = await createTelegramLink(staff, "guardian-1", currentInstant);
    const rawToken = new URL(link.url).searchParams.get("start");
    const data = transaction.telegramLinkToken.create.mock.calls[0]?.[0].data;
    expect(rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.tokenHash).not.toBe(rawToken);
    expect(data.expiresAt).toEqual(new Date("2026-09-19T12:15:00.000Z"));
    expect(transaction.telegramLinkToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { revokedAt: currentInstant } }),
    );
  });

  it("rejects cross-center link creation", async () => {
    mocks.getGuardian.mockResolvedValue({
      id: "guardian-1",
      community: { healthCenterId: "center-b" },
    });
    await expect(
      createTelegramLink(staff, "guardian-1", currentInstant),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rate-limits repeated link generation per guardian", async () => {
    prisma.telegramLinkToken.count.mockResolvedValue(3);
    await expect(
      createTelegramLink(staff, "guardian-1", currentInstant),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(transaction.telegramLinkToken.create).not.toHaveBeenCalled();
  });

  it("consumes a valid token once and links the webhook chat transactionally", async () => {
    transaction.telegramLinkToken.findUnique.mockResolvedValue({
      id: "token-1",
      guardianId: "guardian-1",
      expiresAt: new Date("2026-09-19T12:15:00.000Z"),
      consumedAt: null,
      revokedAt: null,
    });
    await expect(
      consumeTelegramLink(validRawToken, "12345", currentInstant),
    ).resolves.toEqual({ guardianId: "guardian-1" });
    expect(transaction.telegramLinkToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ consumedAt: null, revokedAt: null }),
        data: { consumedAt: currentInstant },
      }),
    );
    expect(transaction.guardianTelegramConnection.upsert).toHaveBeenCalled();
  });

  it.each([
    ["expired", new Date("2026-09-19T11:59:00.000Z"), null],
    ["reused", new Date("2026-09-19T12:15:00.000Z"), currentInstant],
  ])("rejects an %s token", async (_label, expiresAt, consumedAt) => {
    transaction.telegramLinkToken.findUnique.mockResolvedValue({
      id: "token-1",
      guardianId: "guardian-1",
      expiresAt,
      consumedAt,
      revokedAt: null,
    });
    await expect(
      consumeTelegramLink(validRawToken, "12345", currentInstant),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(
      transaction.guardianTelegramConnection.upsert,
    ).not.toHaveBeenCalled();
  });
});
