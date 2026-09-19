import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApplicationUser } from "@/modules/auth/types";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ iterate: vi.fn(), persist: vi.fn() }));
const { iterate, persist } = mocks;
vi.mock("@/modules/vaccination/services/vaccination-service", () => ({
  iterateAuthorizedChildrenVaccinationStatuses: mocks.iterate,
}));
vi.mock("@/modules/alerts/services/operational-alert-batch", () => ({
  persistOperationalAlertCandidates: mocks.persist,
}));

import { generateVaccinationAlerts } from "@/modules/alerts/services/vaccination-alert-service";

const admin: ApplicationUser = {
  id: "system",
  authUserId: "system",
  healthCenterId: null,
  fullName: "Sistema",
  email: "system@internal.invalid",
  role: "ADMIN",
  isActive: true,
};
const baseDose = {
  doseCode: "DOSE",
  doseName: "Primera dosis",
  vaccineName: "Vacuna",
  scheduledDate: "2026-03-01",
  timingNote: null,
  applicable: true,
  vaccinationId: null,
  applicationDate: null,
};

describe("vaccination alert generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persist.mockResolvedValue({
      alerts: [],
      alertsCreated: 1,
      alertsExisting: 0,
      notifications: { created: 0, existing: 0, sent: 0, failed: 0 },
    });
  });

  it("creates candidates only for central OVERDUE results across pages", async () => {
    iterate.mockImplementation(async (_user, options, visit) => {
      expect(options.pageSize).toBe(2);
      await visit({
        child: { id: "child-1" },
        doses: [
          { ...baseDose, id: "overdue", status: "OVERDUE" },
          { ...baseDose, id: "pending", status: "PENDING" },
        ],
      });
      await visit({ child: { id: "historical-child" }, doses: [] });
      return { pages: 2, childrenEvaluated: 2 };
    });

    const result = await generateVaccinationAlerts(
      admin,
      new Date("2026-08-14T12:00:00Z"),
      { pageSize: 2 },
    );

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist.mock.calls[0]?.[1]).toEqual([
      expect.objectContaining({
        childId: "child-1",
        sourceId: "child-1:overdue",
      }),
    ]);
    expect(result).toMatchObject({
      pages: 2,
      recordsEvaluated: 2,
      eligibleFound: 1,
    });
  });
});
