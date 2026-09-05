import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  childCount: vi.fn(),
  communityCount: vi.fn(),
  guardianCount: vi.fn(),
  growthRecordCount: vi.fn(),
  growthRecordFindMany: vi.fn(),
  alertCount: vi.fn(),
  alertGroupBy: vi.fn(),
  alertFindMany: vi.fn(),
  communityFindMany: vi.fn(),
  listStatuses: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    child: { count: mocks.childCount },
    community: {
      count: mocks.communityCount,
      findMany: mocks.communityFindMany,
    },
    guardian: { count: mocks.guardianCount },
    growthRecord: {
      count: mocks.growthRecordCount,
      findMany: mocks.growthRecordFindMany,
    },
    alert: {
      count: mocks.alertCount,
      groupBy: mocks.alertGroupBy,
      findMany: mocks.alertFindMany,
    },
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
    mocks.alertGroupBy.mockResolvedValue([
      {
        type: "VACCINATION",
        severity: "PREVENTIVE",
        _count: { _all: 1 },
      },
    ]);
    mocks.alertFindMany.mockResolvedValue([]);
    mocks.communityFindMany.mockResolvedValue([
      { name: "Comunidad A", _count: { children: 3 } },
    ]);
    mocks.growthRecordFindMany.mockResolvedValue([]);
  });

  it("matches the previous per-child status aggregation with one bulk load", async () => {
    const perChildResults = [
      {
        child: { id: "child-a", fullName: "Niña A" },
        doses: [{ status: "PENDING" }, { status: "APPLIED" }],
      },
      {
        child: { id: "child-b", fullName: "Niño B" },
        doses: [
          {
            id: "dose-b",
            vaccineName: "Vacuna ficticia",
            doseName: "Primera dosis",
            status: "OVERDUE",
          },
          { status: "PENDING" },
        ],
      },
      { child: { id: "child-c", fullName: "Niña C" }, doses: [] },
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
    expect(result).toMatchObject({
      children: 3,
      communities: 2,
      guardians: 3,
      growthRecords: 5,
      openAlerts: 1,
      appliedVaccinations: 1,
      pendingVaccinations: previousAggregation.pending,
      overdueVaccinations: previousAggregation.overdue,
      vaccinationStatus: [
        { status: "APPLIED", count: 1 },
        { status: "PENDING", count: 2 },
        { status: "OVERDUE", count: 1 },
      ],
      alertDistribution: [
        { type: "VACCINATION", severity: "PREVENTIVE", count: 1 },
      ],
      communityDistribution: [{ name: "Comunidad A", children: 3 }],
    });
  });

  it("returns limited actionable and recent factual records", async () => {
    mocks.listStatuses.mockResolvedValue([
      {
        child: { id: "child-a", fullName: "Niña ficticia" },
        doses: [
          {
            id: "dose-a",
            vaccineName: "Vacuna ficticia",
            doseName: "Primera dosis",
            status: "OVERDUE",
          },
        ],
      },
    ]);
    mocks.alertFindMany.mockResolvedValue([
      {
        id: "alert-a",
        type: "GROWTH",
        severity: "PREVENTIVE",
        title: "Seguimiento preventivo",
        createdAt: new Date("2026-09-01T00:00:00Z"),
        child: { id: "child-a", fullName: "Niña ficticia" },
      },
    ]);
    mocks.growthRecordFindMany.mockResolvedValue([
      {
        id: "growth-a",
        measurementDate: new Date("2026-09-01T00:00:00Z"),
        child: { id: "child-a", fullName: "Niña ficticia" },
      },
    ]);

    const result = await getDashboardMetrics(staff);

    expect(result.requiresAttention).toEqual([
      expect.objectContaining({
        kind: "ALERT",
        href: "/app/alertas/alert-a",
      }),
      expect.objectContaining({
        kind: "VACCINATION",
        href: "/app/ninos/child-a/vacunacion",
      }),
    ]);
    expect(result.recentMeasurements).toEqual([
      {
        id: "growth-a",
        childId: "child-a",
        childName: "Niña ficticia",
        measurementDate: "2026-09-01",
      },
    ]);
    expect(mocks.alertFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    );
    expect(mocks.growthRecordFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    );
  });
});
