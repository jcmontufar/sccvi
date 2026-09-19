import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  followUps: vi.fn(),
  vaccinations: vi.fn(),
  communities: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({ community: { findMany: mocks.communities } }),
}));
vi.mock("@/modules/alerts/services/missed-follow-up-service", () => ({
  generateMissedFollowUpAlerts: mocks.followUps,
}));
vi.mock("@/modules/alerts/services/vaccination-alert-service", () => ({
  generateVaccinationAlerts: mocks.vaccinations,
}));

import { runOverdueAlertJob } from "@/modules/alerts/services/overdue-alert-job";

const result = {
  recordsEvaluated: 1,
  eligibleFound: 1,
  alertsCreated: 1,
  alertsExisting: 0,
  notificationsCreated: 0,
  notificationsExisting: 0,
  notificationsSent: 0,
  notificationsFailed: 0,
  pages: 1,
};

describe("overdue alert system job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    mocks.communities.mockResolvedValue([
      { healthCenterId: "center-a" },
      { healthCenterId: "center-b" },
    ]);
    mocks.followUps.mockResolvedValue(result);
    mocks.vaccinations.mockResolvedValue(result);
  });

  it("processes every center with an internal system principal and no session", async () => {
    const summary = await runOverdueAlertJob(new Date("2026-08-15T03:30:00Z"));
    expect(mocks.followUps.mock.calls[0]?.[0]).toMatchObject({
      role: "ADMIN",
      isActive: true,
    });
    expect(summary).toMatchObject({
      centersProcessed: 2,
      businessDate: "2026-08-14",
      errors: [],
    });
  });

  it("controls a partial failure and still runs the other generator", async () => {
    mocks.followUps.mockRejectedValue(new Error("sensitive database detail"));
    const summary = await runOverdueAlertJob();
    expect(mocks.vaccinations).toHaveBeenCalledTimes(1);
    expect(summary.followUps).toBeNull();
    expect(summary.errors).toEqual(["MISSED_FOLLOW_UP_FAILED"]);
    expect(JSON.stringify(summary)).not.toContain("sensitive database detail");
  });
});
