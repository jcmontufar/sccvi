import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApplicationUser } from "@/modules/auth/types";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  prisma: { growthFollowUp: { findMany: vi.fn() } },
  persist: vi.fn(),
}));
const { prisma, persist } = mocks;
vi.mock("@/lib/prisma", () => ({ getPrisma: () => mocks.prisma }));
vi.mock("@/modules/alerts/services/operational-alert-batch", () => ({
  persistOperationalAlertCandidates: mocks.persist,
}));

import { generateMissedFollowUpAlerts } from "@/modules/alerts/services/missed-follow-up-service";

const staff: ApplicationUser = {
  id: "staff",
  authUserId: "auth-staff",
  healthCenterId: "center-a",
  fullName: "Personal",
  email: "staff@example.test",
  role: "HEALTH_STAFF",
  isActive: true,
};

describe("missed follow-up alert generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persist.mockResolvedValue({
      alerts: [],
      alertsCreated: 1,
      alertsExisting: 0,
      notifications: { created: 1, existing: 0, sent: 1, failed: 0 },
    });
  });

  it("uses Guatemala today, center isolation and bounded cursor pages", async () => {
    prisma.growthFollowUp.findMany
      .mockResolvedValueOnce([
        {
          id: "follow-up-1",
          childId: "child-1",
          dueDate: new Date("2026-08-13T00:00:00Z"),
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await generateMissedFollowUpAlerts(
      staff,
      new Date("2026-08-15T03:30:00Z"),
      { pageSize: 1 },
    );

    expect(prisma.growthFollowUp.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        take: 1,
        where: expect.objectContaining({
          dueDate: { lt: new Date("2026-08-14T00:00:00Z") },
          child: {
            isActive: true,
            community: { healthCenterId: "center-a" },
          },
        }),
      }),
    );
    expect(prisma.growthFollowUp.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ cursor: { id: "follow-up-1" }, skip: 1 }),
    );
    expect(result).toMatchObject({
      pages: 1,
      recordsEvaluated: 1,
      eligibleFound: 1,
      alertsCreated: 1,
    });
  });

  it("does not create an alert when no follow-up is yet overdue", async () => {
    prisma.growthFollowUp.findMany.mockResolvedValue([]);
    const result = await generateMissedFollowUpAlerts(staff);
    expect(result.eligibleFound).toBe(0);
    expect(persist).not.toHaveBeenCalled();
  });
});
