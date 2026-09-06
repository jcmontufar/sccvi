import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  growthFindMany: vi.fn(),
  communityFindMany: vi.fn(),
  vaccinationFindMany: vi.fn(),
  alertFindMany: vi.fn(),
  listDoses: vi.fn(),
  listStatuses: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    growthRecord: { findMany: mocks.growthFindMany },
    community: { findMany: mocks.communityFindMany },
    vaccination: { findMany: mocks.vaccinationFindMany },
    alert: { findMany: mocks.alertFindMany },
  }),
}));
vi.mock("@/modules/vaccination/services/vaccination-service", () => ({
  listActiveVaccinationScheduleDoses: mocks.listDoses,
  listAuthorizedChildrenVaccinationStatuses: mocks.listStatuses,
}));

import type { ApplicationUser } from "@/modules/auth/types";
import { getReport } from "@/modules/reports/services/report-service";

const staff: ApplicationUser = {
  id: "staff",
  authUserId: "auth",
  healthCenterId: "center-a",
  fullName: "Personal",
  email: "staff@example.test",
  role: "HEALTH_STAFF",
  isActive: true,
};

function growthRecord(percentile: number, weight: string, createdAt: string) {
  return {
    id: `growth-${weight}`,
    childId: "child-a",
    measurementDate: new Date("2026-08-28T00:00:00Z"),
    createdAt: new Date(createdAt),
    weightKg: { toString: () => weight },
    heightCm: { toString: () => "89.2" },
    assessments: [{ percentile: { toString: () => String(percentile) } }],
    child: {
      fullName: "Carlos Lopez Garcia",
      dateOfBirth: new Date("2024-03-28T00:00:00Z"),
      community: {
        name: "El Rosario",
        healthCenter: { name: "Centro Municipal SCCVI" },
      },
    },
  };
}

describe("functional report queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listDoses.mockResolvedValue({
      versionCode: "GT-MSPAS-2026-01-12",
      doses: [{ doseCode: "BCG-1", label: "BCG — Dosis única" }],
    });
    mocks.listStatuses.mockResolvedValue([]);
    mocks.growthFindMany.mockResolvedValue([]);
    mocks.communityFindMany.mockResolvedValue([]);
    mocks.vaccinationFindMany.mockResolvedValue([]);
    mocks.alertFindMany.mockResolvedValue([]);
  });

  it("keeps low and high factual assessments for the same child and date", async () => {
    mocks.growthFindMany.mockResolvedValue([
      growthRecord(100, "90", "2026-08-28T12:05:00Z"),
      growthRecord(0.878, "10", "2026-08-28T12:00:00Z"),
      growthRecord(5, "11", "2026-08-28T11:55:00Z"),
    ]);

    const low = await getReport(staff, {
      type: "low-weight",
      from: "2026-08-28",
      to: "2026-08-28",
    });
    const high = await getReport(staff, {
      type: "overweight",
      from: "2026-08-28",
      to: "2026-08-28",
    });

    expect(low.rows).toHaveLength(1);
    expect(low.rows[0]?.detalle).toContain("percentil 0.878");
    expect(low.rows[0]?.detalle).toContain("10 kg");
    expect(high.rows).toHaveLength(1);
    expect(high.rows[0]?.detalle).toContain("90 kg");
    expect(mocks.growthFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          child: expect.objectContaining({
            community: { healthCenterId: "center-a" },
          }),
        }),
      }),
    );
  });

  it("handles missing and invalid coverage doses without throwing", async () => {
    const empty = await getReport(staff, {
      type: "vaccination-coverage",
      doseCode: "",
    });
    const invalid = await getReport(staff, {
      type: "vaccination-coverage",
      doseCode: "NOT-A-DOSE",
    });
    expect(empty.rows).toEqual([]);
    expect("notice" in empty && empty.notice).toMatch(/Selecciona una dosis/);
    expect(invalid.rows).toEqual([]);
    expect("notice" in invalid && invalid.notice).toMatch(/no pertenece/);
    expect(mocks.listStatuses).not.toHaveBeenCalled();
  });

  it("calculates a valid selected-dose numerator and denominator", async () => {
    mocks.listStatuses.mockResolvedValue([
      {
        evaluationDate: "2026-08-28",
        child: {
          community: {
            name: "El Rosario",
            healthCenter: { name: "Centro Municipal SCCVI" },
          },
        },
        doses: [
          {
            doseCode: "BCG-1",
            applicable: true,
            status: "APPLIED",
            scheduledDate: "2026-01-01",
          },
        ],
      },
      {
        evaluationDate: "2026-08-28",
        child: {
          community: {
            name: "El Rosario",
            healthCenter: { name: "Centro Municipal SCCVI" },
          },
        },
        doses: [
          {
            doseCode: "BCG-1",
            applicable: true,
            status: "OVERDUE",
            scheduledDate: "2026-01-01",
          },
        ],
      },
    ]);
    const report = await getReport(staff, {
      type: "vaccination-coverage",
      doseCode: "BCG-1",
    });
    expect(report.rows[0]).toMatchObject({
      registro: "BCG — Dosis única",
      detalle: "1/2 · 50.0 %",
    });
    expect(report.analytics.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Aplicadas", value: 1 }),
        expect.objectContaining({ label: "Elegibles", value: 2 }),
      ]),
    );
  });

  it("keeps N/A visible when a community has no eligible child", async () => {
    mocks.listStatuses.mockResolvedValue([
      {
        evaluationDate: "2026-08-28",
        child: {
          community: {
            name: "Sin elegibles",
            healthCenter: { name: "Centro Municipal SCCVI" },
          },
        },
        doses: [
          {
            doseCode: "BCG-1",
            applicable: true,
            status: "PENDING",
            scheduledDate: "2026-09-01",
          },
        ],
      },
    ]);

    const report = await getReport(staff, {
      type: "vaccination-coverage",
      doseCode: "BCG-1",
    });

    expect(report.rows[0]?.detalle).toBe("0/0 · N/A");
    expect(report.analytics.charts[0]?.data[0]).toMatchObject({
      percentage: null,
      detail: "N/A",
    });
  });

  it("distinguishes percentile records from unique children", async () => {
    mocks.growthFindMany.mockResolvedValue([
      growthRecord(1, "10", "2026-08-28T12:00:00Z"),
      growthRecord(2, "10.5", "2026-08-29T12:00:00Z"),
    ]);

    const report = await getReport(staff, { type: "low-weight" });

    expect(report.analytics.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Registros", value: 2 }),
        expect.objectContaining({ label: "Niños únicos", value: 1 }),
      ]),
    );
  });

  it("builds average-growth analytics with separate weight and height charts", async () => {
    mocks.growthFindMany.mockResolvedValue([
      growthRecord(50, "10", "2026-08-28T12:00:00Z"),
    ]);

    const report = await getReport(staff, { type: "average-growth" });

    expect(report.analytics.charts.map(({ title }) => title)).toEqual([
      "Peso promedio por comunidad y edad",
      "Talla promedio por comunidad y edad",
    ]);
    expect(report.analytics.charts[0]?.data[0]?.label).toContain("24–35 meses");
  });

  it("provides structured analytics for every report type", async () => {
    mocks.communityFindMany.mockResolvedValue([
      {
        name: "El Rosario",
        isActive: true,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        healthCenter: { name: "Centro Municipal SCCVI" },
        _count: { children: 2, guardians: 2 },
      },
    ]);
    mocks.growthFindMany.mockResolvedValue([
      growthRecord(99, "12", "2026-08-28T12:00:00Z"),
    ]);
    mocks.vaccinationFindMany.mockResolvedValue([
      {
        childId: "child-a",
        applicationDate: new Date("2026-08-28T00:00:00Z"),
        child: {
          fullName: "Carlos Lopez Garcia",
          community: {
            name: "El Rosario",
            healthCenter: { name: "Centro Municipal SCCVI" },
          },
        },
        vaccineSchedule: {
          doseName: "Dosis única",
          doseNumber: 1,
          scheduleVersion: "GT-MSPAS-2026-01-12",
          version: { code: "GT-MSPAS-2026-01-12" },
          vaccine: { name: "BCG" },
        },
      },
    ]);
    mocks.alertFindMany.mockResolvedValue([
      {
        childId: "child-a",
        createdAt: new Date("2026-08-28T00:00:00Z"),
        title: "Seguimiento preventivo",
        severity: "PREVENTIVE",
        status: "OPEN",
        child: {
          fullName: "Carlos Lopez Garcia",
          community: {
            name: "El Rosario",
            healthCenter: { name: "Centro Municipal SCCVI" },
          },
        },
      },
    ]);
    mocks.listStatuses.mockResolvedValue([
      {
        evaluationDate: "2026-08-28",
        child: {
          id: "child-a",
          fullName: "Carlos Lopez Garcia",
          community: {
            name: "El Rosario",
            healthCenter: { name: "Centro Municipal SCCVI" },
          },
        },
        doses: [
          {
            doseCode: "BCG-1",
            vaccineName: "BCG",
            doseName: "Dosis única",
            applicable: true,
            status: "OVERDUE",
            scheduledDate: "2026-01-01",
          },
        ],
      },
    ]);

    const types = [
      "communities",
      "growth",
      "vaccinations",
      "incomplete-vaccination",
      "overweight",
      "vaccination-coverage",
      "average-growth",
      "alerts",
    ] as const;
    for (const type of types) {
      const report = await getReport(staff, {
        type,
        doseCode: type === "vaccination-coverage" ? "BCG-1" : "",
      });
      expect(report.analytics.metrics.length, type).toBeGreaterThan(0);
      expect(report.analytics.charts.length, type).toBeGreaterThan(0);
    }
  });
});
