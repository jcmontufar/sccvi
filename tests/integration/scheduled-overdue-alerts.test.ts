import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PrismaClient } from "@/generated/prisma/client";
import type { ApplicationUser } from "@/modules/auth/types";
import { generateMissedFollowUpAlerts } from "@/modules/alerts/services/missed-follow-up-service";
import {
  requireIsolatedTestDatabase,
  verifyIsolatedTestDatabase,
} from "../support/test-environment";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: requireIsolatedTestDatabase() }),
});
const suffix = randomUUID();
const ids: Record<string, string> = {};

afterAll(async () => {
  await verifyIsolatedTestDatabase();
  await prisma.$transaction(async (transaction) => {
    if (ids.alert)
      await transaction.alert.deleteMany({ where: { id: ids.alert } });
    if (ids.followUp)
      await transaction.growthFollowUp.deleteMany({
        where: { id: ids.followUp },
      });
    if (ids.growth)
      await transaction.growthRecord.deleteMany({ where: { id: ids.growth } });
    if (ids.child)
      await transaction.child.deleteMany({ where: { id: ids.child } });
    if (ids.user)
      await transaction.user.deleteMany({ where: { id: ids.user } });
    if (ids.community)
      await transaction.community.deleteMany({ where: { id: ids.community } });
    if (ids.center)
      await transaction.healthCenter.deleteMany({ where: { id: ids.center } });
  });
  await prisma.$disconnect();
});

describe("scheduled overdue alert persistence", () => {
  it("creates one alert and remains idempotent on a repeated run", async () => {
    const fixture = await prisma.$transaction(async (transaction) => {
      const center = await transaction.healthCenter.create({
        data: { name: `Centro alerta ${suffix}`, code: `ALERT-${suffix}` },
      });
      const community = await transaction.community.create({
        data: { healthCenterId: center.id, name: `Comunidad alerta ${suffix}` },
      });
      const user = await transaction.user.create({
        data: {
          authUserId: randomUUID(),
          healthCenterId: center.id,
          fullName: `Personal alerta ${suffix}`,
          email: `alert-${suffix}@example.invalid`,
          role: "HEALTH_STAFF",
        },
      });
      const child = await transaction.child.create({
        data: {
          communityId: community.id,
          fullName: `Niño alerta ${suffix}`,
          dateOfBirth: new Date("2025-01-01T00:00:00Z"),
          sex: "MALE",
        },
      });
      const growth = await transaction.growthRecord.create({
        data: {
          childId: child.id,
          measuredByUserId: user.id,
          measurementDate: new Date("2026-07-13T00:00:00Z"),
          weightKg: "10.000",
          heightCm: "80.00",
        },
      });
      const followUp = await transaction.growthFollowUp.create({
        data: {
          childId: child.id,
          scheduledByUserId: user.id,
          sourceGrowthRecordId: growth.id,
          dueDate: new Date("2026-08-13T00:00:00Z"),
        },
      });
      return { center, community, user, child, growth, followUp };
    });
    Object.assign(
      ids,
      Object.fromEntries(
        Object.entries(fixture).map(([key, value]) => [key, value.id]),
      ),
    );
    const applicationUser: ApplicationUser = {
      id: fixture.user.id,
      authUserId: fixture.user.authUserId,
      healthCenterId: fixture.center.id,
      fullName: fixture.user.fullName,
      email: fixture.user.email,
      role: fixture.user.role,
      isActive: true,
    };

    const first = await generateMissedFollowUpAlerts(
      applicationUser,
      new Date("2026-08-15T12:00:00Z"),
    );
    const repeated = await generateMissedFollowUpAlerts(
      applicationUser,
      new Date("2026-08-15T12:00:00Z"),
    );
    const alerts = await prisma.alert.findMany({
      where: { sourceType: "GrowthFollowUp", sourceId: fixture.followUp.id },
    });
    ids.alert = alerts[0]?.id ?? "";

    expect(first).toMatchObject({ alertsCreated: 1, alertsExisting: 0 });
    expect(repeated).toMatchObject({ alertsCreated: 0, alertsExisting: 1 });
    expect(alerts).toHaveLength(1);
  });
});
