import { createHash, randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, describe, expect, it } from "vitest";

import { PrismaClient } from "@/generated/prisma/client";
import { requireIsolatedTestDatabase } from "../support/test-environment";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: requireIsolatedTestDatabase() }),
});
const suffix = randomUUID();
const ids: Record<string, string> = {};

afterAll(async () => {
  await prisma.$transaction(async (transaction) => {
    if (ids.qr) await transaction.qRToken.deleteMany({ where: { id: ids.qr } });
    if (ids.alert)
      await transaction.alert.deleteMany({ where: { id: ids.alert } });
    if (ids.vaccination)
      await transaction.vaccination.deleteMany({
        where: { id: ids.vaccination },
      });
    if (ids.schedule)
      await transaction.vaccineSchedule.deleteMany({
        where: { id: ids.schedule },
      });
    if (ids.version)
      await transaction.vaccineScheduleVersion.deleteMany({
        where: { id: ids.version },
      });
    if (ids.vaccine)
      await transaction.vaccine.deleteMany({ where: { id: ids.vaccine } });
    if (ids.assessment)
      await transaction.growthAssessment.deleteMany({
        where: { id: ids.assessment },
      });
    if (ids.growth)
      await transaction.growthRecord.deleteMany({ where: { id: ids.growth } });
    if (ids.relation)
      await transaction.childGuardian.deleteMany({
        where: { id: ids.relation },
      });
    if (ids.child)
      await transaction.child.deleteMany({ where: { id: ids.child } });
    if (ids.guardian)
      await transaction.guardian.deleteMany({ where: { id: ids.guardian } });
    if (ids.user)
      await transaction.user.deleteMany({ where: { id: ids.user } });
    if (ids.community)
      await transaction.community.deleteMany({ where: { id: ids.community } });
    if (ids.center)
      await transaction.healthCenter.deleteMany({ where: { id: ids.center } });
  });
  await prisma.$disconnect();
});

describe("critical persistence workflows", () => {
  it("persists isolated registry, growth, vaccination, alert and QR relations", async () => {
    const fixture = await prisma.$transaction(async (transaction) => {
      const center = await transaction.healthCenter.create({
        data: { name: `Centro ficticio ${suffix}`, code: `TEST-${suffix}` },
      });
      const community = await transaction.community.create({
        data: {
          healthCenterId: center.id,
          name: `Comunidad ficticia ${suffix}`,
        },
      });
      const user = await transaction.user.create({
        data: {
          authUserId: randomUUID(),
          healthCenterId: center.id,
          fullName: `Personal ficticio ${suffix}`,
          email: `staff-${suffix}@example.invalid`,
          role: "HEALTH_STAFF",
        },
      });
      const guardian = await transaction.guardian.create({
        data: {
          communityId: community.id,
          fullName: `Tutor ficticio ${suffix}`,
        },
      });
      const child = await transaction.child.create({
        data: {
          communityId: community.id,
          fullName: `Niño ficticio ${suffix}`,
          dateOfBirth: new Date("2025-01-01T00:00:00Z"),
          sex: "MALE",
        },
      });
      const relation = await transaction.childGuardian.create({
        data: { childId: child.id, guardianId: guardian.id, isPrimary: true },
      });
      const growth = await transaction.growthRecord.create({
        data: {
          childId: child.id,
          measuredByUserId: user.id,
          measurementDate: new Date("2025-02-01T00:00:00Z"),
          weightKg: "4.500",
          heightCm: "54.00",
          measurementMethod: "RECUMBENT_LENGTH",
        },
      });
      const assessment = await transaction.growthAssessment.create({
        data: {
          growthRecordId: growth.id,
          indicator: "WEIGHT_FOR_AGE",
          standardName: "SCCVI_TEST_FIXTURE",
          standardVersion: "NON_CLINICAL",
          calculatedAt: new Date("2025-02-01T00:00:00Z"),
        },
      });
      const vaccine = await transaction.vaccine.create({
        data: { name: `Vacuna ficticia no clínica ${suffix}`, isActive: false },
      });
      const version = await transaction.vaccineScheduleVersion.create({
        data: {
          code: `SCCVI-TEST-${suffix}`,
          name: "Esquema ficticio no clínico",
          authority: "SCCVI_TEST_ONLY",
          publishedAt: new Date("2025-01-01T00:00:00Z"),
          effectiveFrom: new Date("2025-01-01T00:00:00Z"),
          sourceUrl: "https://example.invalid/sccvi-test-only",
          isActive: false,
        },
      });
      const schedule = await transaction.vaccineSchedule.create({
        data: {
          vaccineId: vaccine.id,
          scheduleVersionId: version.id,
          doseCode: `TEST-DOSE-${suffix}`,
          doseName: "Dosis ficticia",
          doseNumber: 1,
          scheduleName: "SCCVI_TEST_ONLY",
          scheduleVersion: version.code,
          isActive: false,
        },
      });
      const vaccination = await transaction.vaccination.create({
        data: {
          childId: child.id,
          vaccineScheduleId: schedule.id,
          administeredByUserId: user.id,
          applicationDate: new Date("2025-02-01T00:00:00Z"),
        },
      });
      const alert = await transaction.alert.create({
        data: {
          childId: child.id,
          type: "MISSED_FOLLOW_UP",
          severity: "PREVENTIVE",
          title: "Fixture ficticia",
          message: "Seguimiento ficticio no clínico.",
          sourceType: "IntegrationTest",
          sourceId: suffix,
        },
      });
      const qr = await transaction.qRToken.create({
        data: {
          childId: child.id,
          createdByUserId: user.id,
          tokenHash: createHash("sha256").update(suffix).digest("hex"),
        },
      });
      return {
        center,
        community,
        user,
        guardian,
        child,
        relation,
        growth,
        assessment,
        vaccine,
        version,
        schedule,
        vaccination,
        alert,
        qr,
      };
    });
    Object.assign(
      ids,
      Object.fromEntries(
        Object.entries(fixture).map(([key, value]) => [key, value.id]),
      ),
    );

    const loaded = await prisma.child.findUnique({
      where: { id: fixture.child.id },
      include: {
        childGuardians: true,
        growthRecords: { include: { assessments: true } },
        vaccinations: true,
        alerts: true,
        qrTokens: true,
      },
    });
    expect(loaded).toMatchObject({
      id: fixture.child.id,
      childGuardians: [{ guardianId: fixture.guardian.id }],
      growthRecords: [
        { assessments: [{ standardName: "SCCVI_TEST_FIXTURE" }] },
      ],
      vaccinations: [{ id: fixture.vaccination.id }],
      alerts: [{ status: "OPEN" }],
      qrTokens: [{ id: fixture.qr.id }],
    });

    const resolved = await prisma.alert.update({
      where: { id: fixture.alert.id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolvedByUserId: fixture.user.id,
      },
    });
    expect(resolved.status).toBe("RESOLVED");
  });
});
