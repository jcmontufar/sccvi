import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PrismaClient } from "@/generated/prisma/client";
import { getAnalytics } from "@/modules/analytics/services/analytics-service";
import { getReport } from "@/modules/reports/services/report-service";
import {
  requireIsolatedTestDatabase,
  verifyIsolatedTestDatabase,
} from "../support/test-environment";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: requireIsolatedTestDatabase() }),
});
const suffix = randomUUID();
const created = {
  centerId: "",
  userId: "",
  communityIds: [] as string[],
  childIds: [] as string[],
  vaccinationId: "",
};

afterAll(async () => {
  await verifyIsolatedTestDatabase();
  await prisma.$transaction(async (transaction) => {
    if (created.vaccinationId) {
      await transaction.vaccination.deleteMany({
        where: { id: created.vaccinationId },
      });
    }
    if (created.childIds.length) {
      await transaction.child.deleteMany({
        where: { id: { in: created.childIds } },
      });
    }
    if (created.userId) {
      await transaction.user.deleteMany({ where: { id: created.userId } });
    }
    if (created.communityIds.length) {
      await transaction.community.deleteMany({
        where: { id: { in: created.communityIds } },
      });
    }
    if (created.centerId) {
      await transaction.healthCenter.deleteMany({
        where: { id: created.centerId },
      });
    }
  });
  await prisma.$disconnect();
});

describe("isolated analytics read model", () => {
  it("preserves central coverage semantics and center isolation", async () => {
    const schedule = await prisma.vaccineSchedule.findFirstOrThrow({
      where: {
        doseCode: "VARICELLA_1",
        isActive: true,
        version: { code: "GT-MSPAS-2026-01-12", isActive: true },
      },
    });
    const fixture = await prisma.$transaction(async (transaction) => {
      const center = await transaction.healthCenter.create({
        data: { name: `Centro analítica ${suffix}` },
      });
      const user = await transaction.user.create({
        data: {
          authUserId: randomUUID(),
          healthCenterId: center.id,
          fullName: "Personal ficticio de analítica",
          email: `analytics-${suffix}@example.invalid`,
          role: "HEALTH_STAFF",
        },
      });
      const inputs = [
        ["Histórica", "2024-03-15"],
        ["Elegible sin aplicación", "2025-01-12"],
        ["Elegible aplicada", "2025-01-12"],
      ] as const;
      const communities: Array<{ id: string }> = [];
      const children: Array<{ id: string }> = [];
      for (const [name, dateOfBirth] of inputs) {
        const community = await transaction.community.create({
          data: { healthCenterId: center.id, name: `${name} ${suffix}` },
        });
        communities.push(community);
        children.push(
          await transaction.child.create({
            data: {
              communityId: community.id,
              fullName: `Niño ficticio ${name} ${suffix}`,
              dateOfBirth: new Date(`${dateOfBirth}T00:00:00Z`),
              sex: "MALE",
            },
          }),
        );
      }
      const vaccination = await transaction.vaccination.create({
        data: {
          childId: children[2].id,
          vaccineScheduleId: schedule.id,
          administeredByUserId: user.id,
          applicationDate: new Date("2026-04-12T00:00:00Z"),
        },
      });
      return { center, user, communities, children, vaccination };
    });
    created.centerId = fixture.center.id;
    created.userId = fixture.user.id;
    created.communityIds = fixture.communities.map(({ id }) => id);
    created.childIds = fixture.children.map(({ id }) => id);
    created.vaccinationId = fixture.vaccination.id;

    const applicationUser = {
      id: fixture.user.id,
      authUserId: fixture.user.authUserId,
      healthCenterId: fixture.center.id,
      fullName: fixture.user.fullName,
      email: fixture.user.email,
      role: fixture.user.role,
      isActive: true,
    };
    const result = await getAnalytics(applicationUser, {
      from: "2026-01-01",
      to: "2026-08-28",
      cutoffDate: "2026-08-28",
      doseCode: "VARICELLA_1",
    });
    const coverage = new Map(
      result.vaccination.coverage.map((row) => [row.community, row]),
    );

    expect(result.summary.activeChildren).toBe(3);
    expect(result.processing.childrenEvaluated).toBe(3);
    expect(coverage.get(`Histórica ${suffix}`)).toMatchObject({
      applied: 0,
      eligible: 0,
      percentage: null,
    });
    expect(coverage.get(`Elegible sin aplicación ${suffix}`)).toMatchObject({
      applied: 0,
      eligible: 1,
      percentage: 0,
    });
    expect(coverage.get(`Elegible aplicada ${suffix}`)).toMatchObject({
      applied: 1,
      eligible: 1,
      percentage: 100,
    });

    const existingReport = await getReport(
      applicationUser,
      { type: "vaccination-coverage", doseCode: "VARICELLA_1" },
      new Date("2026-08-28T12:00:00-06:00"),
    );
    const reportDetails = new Map(
      existingReport.rows.map((row) => [row.comunidad, row.detalle]),
    );
    expect(reportDetails.get(`Histórica ${suffix}`)).toBe("0/0 · N/A");
    expect(reportDetails.get(`Elegible sin aplicación ${suffix}`)).toBe(
      "0/1 · 0.0 %",
    );
    expect(reportDetails.get(`Elegible aplicada ${suffix}`)).toBe(
      "1/1 · 100.0 %",
    );
  });
});
