import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  childCount: vi.fn(),
  communityCount: vi.fn(),
  guardianCount: vi.fn(),
  growthRecordCount: vi.fn(),
  alertCount: vi.fn(),
  listStatuses: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    child: { count: mocks.childCount },
    community: { count: mocks.communityCount },
    guardian: { count: mocks.guardianCount },
    growthRecord: { count: mocks.growthRecordCount },
    alert: { count: mocks.alertCount },
  }),
}));

vi.mock("@/modules/vaccination/services/vaccination-service", () => ({
  listAuthorizedChildrenVaccinationStatuses: mocks.listStatuses,
}));

import type { ApplicationUser } from "@/modules/auth/types";
import { getDashboardMetrics } from "@/modules/dashboard/services/dashboard-service";

const staff: ApplicationUser = {
  id: "staff-a",
  authUserId: "auth-a",
  healthCenterId: "center-a",
  fullName: "Personal ficticio",
  email: "staff@example.test",
  role: "HEALTH_STAFF",
  isActive: true,
};

describe("dashboard vaccination aggregation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.childCount.mockResolvedValue(3);
    mocks.communityCount.mockResolvedValue(2);
    mocks.guardianCount.mockResolvedValue(3);
    mocks.growthRecordCount.mockResolvedValue(5);
    mocks.alertCount.mockResolvedValue(1);
  });

  it("matches the previous per-child status aggregation with one bulk load", async () => {
    const perChildResults = [
      { doses: [{ status: "PENDING" }, { status: "APPLIED" }] },
      { doses: [{ status: "OVERDUE" }, { status: "PENDING" }] },
      { doses: [] },
    ];
    mocks.listStatuses.mockResolvedValue(perChildResults);

    const previousAggregation = perChildResults.reduce(
      (counts, child) => ({
        pending:
          counts.pending +
          child.doses.filter((dose) => dose.status === "PENDING").length,
        overdue:
          counts.overdue +
          child.doses.filter((dose) => dose.status === "OVERDUE").length,
      }),
      { pending: 0, overdue: 0 },
    );

    const result = await getDashboardMetrics(staff);

    expect(mocks.listStatuses).toHaveBeenCalledTimes(1);
    expect(mocks.listStatuses).toHaveBeenCalledWith(staff);
    expect(result).toEqual({
      children: 3,
      communities: 2,
      guardians: 3,
      growthRecords: 5,
      openAlerts: 1,
      pendingVaccinations: previousAggregation.pending,
      overdueVaccinations: previousAggregation.overdue,
    });
  });
});
