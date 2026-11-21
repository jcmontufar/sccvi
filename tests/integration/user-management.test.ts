import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getPrisma } from "@/lib/prisma";
import type { ApplicationUser } from "@/modules/auth/types";
import {
  setUserActive,
  updateUser,
} from "@/modules/users/services/user-service";
import { verifyIsolatedTestDatabase } from "../support/test-environment";

const prisma = getPrisma();
const ids: { center?: string; admin?: string; managed?: string } = {};

afterAll(async () => {
  await verifyIsolatedTestDatabase();
  await prisma.$transaction(async (transaction) => {
    if (ids.admin || ids.managed) {
      await transaction.auditLog.deleteMany({
        where: {
          userId: {
            in: [ids.admin, ids.managed].filter((id): id is string =>
              Boolean(id),
            ),
          },
        },
      });
    }
    if (ids.managed)
      await transaction.user.delete({ where: { id: ids.managed } });
    if (ids.admin) await transaction.user.delete({ where: { id: ids.admin } });
    if (ids.center)
      await transaction.healthCenter.delete({ where: { id: ids.center } });
  });
});

describe("isolated RF-003 persistence", () => {
  it("updates a profile, audits safe metadata and deactivates without deleting it", async () => {
    const fixture = await prisma.$transaction(async (transaction) => {
      const center = await transaction.healthCenter.create({
        data: { name: `Centro de usuarios ${randomUUID()}` },
      });
      const admin = await transaction.user.create({
        data: {
          authUserId: randomUUID(),
          fullName: "Administradora ficticia",
          email: `admin-${randomUUID()}@example.test`,
          role: "ADMIN",
        },
      });
      const managed = await transaction.user.create({
        data: {
          authUserId: randomUUID(),
          fullName: "Usuario ficticio",
          email: `usuario-${randomUUID()}@example.test`,
          role: "HEALTH_STAFF",
          healthCenterId: center.id,
        },
      });
      return { center, admin, managed };
    });
    ids.center = fixture.center.id;
    ids.admin = fixture.admin.id;
    ids.managed = fixture.managed.id;
    const actor = fixture.admin as ApplicationUser;

    await updateUser(actor, fixture.managed.id, {
      fullName: "Responsable ficticio",
      role: "CENTER_MANAGER",
      healthCenterId: fixture.center.id,
      guardianId: "",
    });
    await setUserActive(actor, fixture.managed.id, false);
    const persisted = await prisma.user.findUniqueOrThrow({
      where: { id: fixture.managed.id },
    });
    expect(persisted.role).toBe("CENTER_MANAGER");
    expect(persisted.fullName).toBe("Responsable ficticio");
    expect(persisted.isActive).toBe(false);
    expect(persisted.authUserId).toBe(fixture.managed.authUserId);

    const audit = await prisma.auditLog.findMany({
      where: { userId: fixture.admin.id, entityId: fixture.managed.id },
      orderBy: { createdAt: "asc" },
    });
    expect(audit.map((event) => event.action)).toEqual([
      "USER_UPDATED",
      "USER_STATUS_CHANGED",
    ]);
    const metadata = JSON.stringify(audit.map((event) => event.metadata));
    expect(metadata).not.toContain("email");
    expect(metadata).not.toContain("password");
    expect(metadata).not.toContain(fixture.managed.email);
  });
});
