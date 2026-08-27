import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PrismaClient } from "@/generated/prisma/client";
import type { ApplicationUser } from "@/modules/auth/types";
import { associateGuardian } from "@/modules/children/services/child-service";
import { communityService } from "@/modules/communities/queries/prisma-community-repository";
import {
  createGuardian,
  setGuardianActive,
  updateGuardian,
} from "@/modules/guardians/services/guardian-service";
import {
  setHealthCenterActive,
  updateHealthCenter,
} from "@/modules/health-centers/services/health-center-service";
import {
  createVaccine,
  setVaccineActive,
  updateVaccine,
} from "@/modules/vaccination/services/vaccine-service";
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
    await transaction.auditLog.deleteMany({
      where: { userId: ids.user || undefined },
    });
    if (ids.association) {
      await transaction.childGuardian.deleteMany({
        where: { id: ids.association },
      });
    }
    if (ids.child) {
      await transaction.child.deleteMany({ where: { id: ids.child } });
    }
    if (ids.guardian) {
      await transaction.guardian.deleteMany({ where: { id: ids.guardian } });
    }
    if (ids.vaccine) {
      await transaction.vaccine.deleteMany({ where: { id: ids.vaccine } });
    }
    if (ids.user) {
      await transaction.user.deleteMany({ where: { id: ids.user } });
    }
    if (ids.community) {
      await transaction.community.deleteMany({ where: { id: ids.community } });
    }
    if (ids.auditedCommunity) {
      await transaction.community.deleteMany({
        where: { id: ids.auditedCommunity },
      });
    }
    if (ids.center) {
      await transaction.healthCenter.deleteMany({ where: { id: ids.center } });
    }
  });
  await prisma.$disconnect();
});

describe("critical mutation audit coverage", () => {
  it("records sanitized audit events for implemented administrative mutations", async () => {
    const fixture = await prisma.$transaction(async (transaction) => {
      const center = await transaction.healthCenter.create({
        data: { name: `Centro auditoría ${suffix}` },
      });
      const community = await transaction.community.create({
        data: {
          healthCenterId: center.id,
          name: `Comunidad auditoría ${suffix}`,
        },
      });
      const user = await transaction.user.create({
        data: {
          authUserId: randomUUID(),
          healthCenterId: center.id,
          fullName: "Administradora ficticia",
          email: `admin-${suffix}@example.test`,
          role: "ADMIN",
        },
      });
      const child = await transaction.child.create({
        data: {
          communityId: community.id,
          fullName: "Niño ficticio de auditoría",
          dateOfBirth: new Date("2025-01-01T00:00:00Z"),
          sex: "MALE",
        },
      });
      return { center, community, user, child };
    });
    ids.center = fixture.center.id;
    ids.community = fixture.community.id;
    ids.user = fixture.user.id;
    ids.child = fixture.child.id;
    const admin = fixture.user as ApplicationUser;

    await updateHealthCenter(admin, fixture.center.id, {
      name: `Centro actualizado ${suffix}`,
      code: "",
      address: "",
      phone: "",
      email: "",
    });
    const auditedCommunity = await communityService.create(admin, {
      healthCenterId: fixture.center.id,
      name: `Comunidad creada ${suffix}`,
      location: "",
      estimatedFamilies: "",
    });
    ids.auditedCommunity = auditedCommunity.id;
    await communityService.update(admin, auditedCommunity.id, {
      healthCenterId: fixture.center.id,
      name: `Comunidad actualizada ${suffix}`,
      location: "",
      estimatedFamilies: "",
    });
    const guardian = await createGuardian(admin, {
      communityId: auditedCommunity.id,
      fullName: "Tutora ficticia",
      identification: "",
      phone: "",
      email: "audit@example.test",
      preferredNotificationChannel: "EMAIL",
    });
    ids.guardian = guardian.id;
    await updateGuardian(admin, guardian.id, {
      communityId: auditedCommunity.id,
      fullName: "Tutora ficticia actualizada",
      identification: "",
      phone: "",
      email: "changed@example.test",
      preferredNotificationChannel: "EMAIL",
    });
    const association = await associateGuardian(admin, fixture.child.id, {
      guardianId: guardian.id,
      relationshipType: "Tutora",
      isPrimary: true,
    });
    ids.association = association.id;
    const vaccine = await createVaccine(admin, {
      name: `Vacuna ficticia ${suffix}`,
      description: "Descripción ficticia",
    });
    ids.vaccine = vaccine.id;
    await updateVaccine(admin, vaccine.id, {
      name: `Vacuna ficticia actualizada ${suffix}`,
      description: "Otra descripción ficticia",
    });
    await setVaccineActive(admin, vaccine.id, false);
    await setGuardianActive(admin, guardian.id, false);
    await communityService.setActive(admin, auditedCommunity.id, false);
    await setHealthCenterActive(admin, fixture.center.id, false);

    const audits = await prisma.auditLog.findMany({
      where: { userId: admin.id },
      select: { action: true, metadata: true },
    });
    expect(audits.map(({ action }) => action)).toEqual(
      expect.arrayContaining([
        "HEALTH_CENTER_UPDATED",
        "HEALTH_CENTER_STATUS_CHANGED",
        "COMMUNITY_CREATED",
        "COMMUNITY_UPDATED",
        "COMMUNITY_STATUS_CHANGED",
        "GUARDIAN_CREATED",
        "GUARDIAN_UPDATED",
        "GUARDIAN_STATUS_CHANGED",
        "CHILD_GUARDIAN_ASSOCIATED",
        "VACCINE_CREATED",
        "VACCINE_UPDATED",
        "VACCINE_STATUS_CHANGED",
      ]),
    );
    const serialized = JSON.stringify(audits);
    expect(serialized).not.toContain("audit@example.test");
    expect(serialized).not.toContain("changed@example.test");
    expect(serialized).not.toContain("Descripción ficticia");
  }, 20_000);

  it("rolls back a mutation when its audit foreign key fails", async () => {
    await prisma.healthCenter.update({
      where: { id: ids.center },
      data: { isActive: true },
    });
    await prisma.community.update({
      where: { id: ids.community },
      data: { isActive: true },
    });
    const before = await prisma.guardian.count({
      where: { fullName: `Tutora rollback ${suffix}` },
    });
    const invalidAuditUser: ApplicationUser = {
      id: randomUUID(),
      authUserId: randomUUID(),
      healthCenterId: ids.center,
      fullName: "Usuario inexistente",
      email: "missing@example.test",
      role: "ADMIN",
      isActive: true,
    };
    await expect(
      createGuardian(invalidAuditUser, {
        communityId: ids.community,
        fullName: `Tutora rollback ${suffix}`,
        identification: "",
        phone: "",
        email: "rollback@example.test",
        preferredNotificationChannel: "EMAIL",
      }),
    ).rejects.toBeDefined();
    expect(
      await prisma.guardian.count({
        where: { fullName: `Tutora rollback ${suffix}` },
      }),
    ).toBe(before);
  });
});
