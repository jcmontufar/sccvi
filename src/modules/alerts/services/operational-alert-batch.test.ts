import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApplicationUser } from "@/modules/auth/types";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  prisma: { alert: { createMany: vi.fn(), findMany: vi.fn() } },
  sendEmails: vi.fn(),
}));
const { prisma, sendEmails } = mocks;
vi.mock("@/lib/prisma", () => ({ getPrisma: () => mocks.prisma }));
vi.mock("@/modules/notifications/services/alert-email-service", () => ({
  sendOperationalAlertEmailsForAlerts: mocks.sendEmails,
}));

import { persistOperationalAlertCandidates } from "@/modules/alerts/services/operational-alert-batch";

const admin: ApplicationUser = {
  id: "admin",
  authUserId: "auth-admin",
  healthCenterId: null,
  fullName: "Administración",
  email: "admin@example.test",
  role: "ADMIN",
  isActive: true,
};
const candidate = {
  childId: "child-1",
  type: "MISSED_FOLLOW_UP" as const,
  severity: "PREVENTIVE" as const,
  title: "Seguimiento pendiente",
  message: "Requiere seguimiento.",
  sourceType: "GrowthFollowUp",
  sourceId: "follow-up-1",
};

describe("operational alert batch idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.alert.findMany.mockResolvedValue([{ id: "alert-1" }]);
    sendEmails.mockResolvedValue({
      eligibleRecipients: 1,
      created: 0,
      existing: 1,
      sent: 0,
      failed: 0,
    });
  });

  it("uses the persisted unique identity across repeated executions", async () => {
    prisma.alert.createMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const first = await persistOperationalAlertCandidates(admin, [candidate]);
    const repeated = await persistOperationalAlertCandidates(admin, [
      candidate,
    ]);

    expect(first.alertsCreated).toBe(1);
    expect(repeated.alertsCreated).toBe(0);
    expect(repeated.alertsExisting).toBe(1);
    expect(prisma.alert.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
  });
});
