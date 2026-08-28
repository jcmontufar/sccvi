import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { ApplicationUser } from "@/modules/auth/types";
import { evaluateVaccinationScheduleForChild } from "@/modules/vaccination/services/vaccination-status";

vi.mock("server-only", () => ({}));

const prisma = {
  vaccineScheduleVersion: { findFirst: vi.fn() },
  vaccineSchedule: { findMany: vi.fn() },
  child: { findMany: vi.fn() },
  vaccination: { findMany: vi.fn() },
};
vi.mock("@/lib/prisma", () => ({ getPrisma: () => prisma }));

let listAuthorizedChildrenVaccinationStatuses: typeof import("@/modules/vaccination/services/vaccination-service").listAuthorizedChildrenVaccinationStatuses;
let listActiveVaccinationScheduleDoses: typeof import("@/modules/vaccination/services/vaccination-service").listActiveVaccinationScheduleDoses;

const staff: ApplicationUser = {
  id: "staff-a",
  authUserId: "auth-a",
  healthCenterId: "center-a",
  fullName: "Personal ficticio",
  email: "staff@example.test",
  role: "HEALTH_STAFF",
  isActive: true,
};
const version = {
  id: "version-current",
  code: "GT-MSPAS-2026-01-12",
  effectiveFrom: new Date("2026-01-12T00:00:00Z"),
  effectiveTo: null,
};
const schedule = {
  id: "hex-2m",
  doseCode: "HEX-1",
  doseName: "Primera dosis",
  doseNumber: 1,
  timingNote: null,
  recommendedAgeMonths: 2,
  recommendedAgeDays: null,
  minimumAgeMonths: null,
  minimumAgeDays: null,
  maximumAgeMonths: null,
  maximumAgeDays: null,
  maximumAgeExclusive: false,
  vaccine: { name: "Hexavalente", officialCode: "HEXAVALENT" },
};

beforeAll(async () => {
  ({ listAuthorizedChildrenVaccinationStatuses } =
    await import("@/modules/vaccination/services/vaccination-service"));
  ({ listActiveVaccinationScheduleDoses } =
    await import("@/modules/vaccination/services/vaccination-service"));
});

beforeEach(() => {
  vi.clearAllMocks();
  prisma.vaccineScheduleVersion.findFirst.mockResolvedValue(version);
  prisma.vaccineSchedule.findMany.mockResolvedValue([schedule]);
  prisma.child.findMany.mockResolvedValue([
    {
      id: "historical-child",
      fullName: "Niño histórico",
      dateOfBirth: new Date("2024-01-01T00:00:00Z"),
      community: {
        name: "Comunidad A",
        healthCenter: { name: "Centro A" },
      },
    },
    {
      id: "current-child",
      fullName: "Niño actual",
      dateOfBirth: new Date("2025-12-01T00:00:00Z"),
      community: {
        name: "Comunidad A",
        healthCenter: { name: "Centro A" },
      },
    },
  ]);
  prisma.vaccination.findMany.mockResolvedValue([]);
});

describe("bulk vaccination status query", () => {
  it("lists human-readable doses only from the active applicable version", async () => {
    const result = await listActiveVaccinationScheduleDoses(
      staff,
      new Date("2026-08-27T12:00:00Z"),
    );
    expect(result).toEqual({
      versionCode: version.code,
      doses: [{ doseCode: "HEX-1", label: "Hexavalente — Primera dosis" }],
    });
    expect(prisma.vaccineSchedule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          scheduleVersionId: version.id,
          isActive: true,
          doseCode: { not: null },
        },
      }),
    );
  });

  it("bulk-loads one scoped cohort and preserves central evaluator semantics", async () => {
    const results = await listAuthorizedChildrenVaccinationStatuses(
      staff,
      new Date("2026-08-27T12:00:00Z"),
    );

    expect(prisma.vaccineScheduleVersion.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.vaccineSchedule.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.child.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.vaccination.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.child.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          community: { healthCenterId: "center-a" },
        }),
      }),
    );

    expect(results[0]?.doses).toEqual([]);
    expect(results[1]?.doses).toEqual(
      evaluateVaccinationScheduleForChild({
        dateOfBirth: "2025-12-01",
        evaluationDate: "2026-08-27",
        version: {
          code: version.code,
          effectiveFrom: "2026-01-12",
          effectiveTo: null,
        },
        schedules: [
          {
            ...schedule,
            vaccineName: schedule.vaccine.name,
            vaccineOfficialCode: schedule.vaccine.officialCode,
          },
        ],
        vaccinations: [],
      }),
    );
    expect(results[1]?.doses[0]?.status).toBe("OVERDUE");
  });

  it("does not query vaccinations when the authorized cohort is empty", async () => {
    prisma.child.findMany.mockResolvedValue([]);
    expect(await listAuthorizedChildrenVaccinationStatuses(staff)).toEqual([]);
    expect(prisma.vaccination.findMany).not.toHaveBeenCalled();
  });
});
