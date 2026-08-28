import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PrismaClient } from "@/generated/prisma/client";
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

describe("isolated VARICELLA_1 coverage", () => {
  it("separates historical, eligible-unvaccinated and eligible-applied cohorts", async () => {
    const schedule = await prisma.vaccineSchedule.findFirstOrThrow({
      where: {
        doseCode: "VARICELLA_1",
        isActive: true,
        version: { code: "GT-MSPAS-2026-01-12", isActive: true },
      },
    });
    const fixture = await prisma.$transaction(async (transaction) => {
      const center = await transaction.healthCenter.create({
        data: { name: `Centro cobertura ${suffix}` },
      });
      const user = await transaction.user.create({
        data: {
          authUserId: randomUUID(),
          healthCenterId: center.id,
          fullName: "Personal ficticio de cobertura",
          email: `coverage-${suffix}@example.invalid`,
          role: "HEALTH_STAFF",
        },
      });
      const communityInputs = [
        ["Histórica", "2024-03-15"],
        ["Elegible sin aplicación", "2025-01-12"],
        ["Elegible aplicada", "2025-01-12"],
      ] as const;
      const communities: { id: string }[] = [];
      const children: { id: string }[] = [];
      for (const [label, dateOfBirth] of communityInputs) {
        const community = await transaction.community.create({
          data: {
            healthCenterId: center.id,
            name: `${label} ${suffix}`,
          },
        });
        communities.push(community);
        children.push(
          await transaction.child.create({
            data: {
              communityId: community.id,
              fullName: `Niño ficticio ${label} ${suffix}`,
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

    const report = await getReport(
      {
        id: fixture.user.id,
        authUserId: fixture.user.authUserId,
        healthCenterId: fixture.center.id,
        fullName: fixture.user.fullName,
        email: fixture.user.email,
        role: fixture.user.role,
        isActive: true,
      },
      { type: "vaccination-coverage", doseCode: "VARICELLA_1" },
      new Date("2026-08-28T12:00:00-06:00"),
    );
    const detailByCommunity = new Map(
      report.rows.map((row) => [row.comunidad, row.detalle]),
    );
    expect(detailByCommunity.get(`Histórica ${suffix}`)).toBe("0/0 · N/A");
    expect(detailByCommunity.get(`Elegible sin aplicación ${suffix}`)).toBe(
      "0/1 · 0.0 %",
    );
    expect(detailByCommunity.get(`Elegible aplicada ${suffix}`)).toBe(
      "1/1 · 100.0 %",
    );
  });
});
