import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { getPrisma } from "@/lib/prisma";
import type { ApplicationUser } from "@/modules/auth/types";
import {
  createHealthCenter,
  listHealthCenters,
} from "@/modules/health-centers/services/health-center-service";
import { verifyIsolatedTestDatabase } from "../support/test-environment";

const prisma = getPrisma();
const centers: string[] = [];
let admin: ApplicationUser;
beforeAll(async () => {
  await verifyIsolatedTestDatabase();
  admin = await prisma.user.create({
    data: {
      authUserId: randomUUID(),
      fullName: "Admin ficticio de centros",
      email: `admin-${randomUUID()}@example.test`,
      role: "ADMIN",
    },
  });
});
afterAll(async () => {
  await verifyIsolatedTestDatabase();
  await prisma.$transaction(async (tx) => {
    if (admin) {
      await tx.auditLog.deleteMany({ where: { userId: admin.id } });
      await tx.user.delete({ where: { id: admin.id } });
    }
    await tx.healthCenter.deleteMany({ where: { id: { in: centers } } });
  });
});

describe("isolated health-center creation", () => {
  it("persists an active center, sanitized audit and unique code while preserving center scope", async () => {
    const input = {
      name: "Centro ficticio integración",
      code: randomUUID(),
      address: "Dirección ficticia",
      phone: "55550000",
      email: "centro@example.test",
    };
    const center = await createHealthCenter(admin, input);
    centers.push(center.id);
    expect(
      await prisma.healthCenter.findUnique({ where: { id: center.id } }),
    ).toMatchObject({ ...input, isActive: true });
    const audit = await prisma.auditLog.findMany({
      where: { entityId: center.id, action: "HEALTH_CENTER_CREATED" },
    });
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      userId: admin.id,
      entityType: "HealthCenter",
    });
    expect(audit[0].metadata).toBeNull();
    await expect(createHealthCenter(admin, input)).rejects.toMatchObject({
      code: "HEALTH_CENTER_DUPLICATE",
    });
    const other = await createHealthCenter(admin, {
      ...input,
      code: randomUUID(),
    });
    centers.push(other.id);
    const scoped = {
      ...admin,
      role: "CENTER_MANAGER" as const,
      healthCenterId: center.id,
    };
    expect((await listHealthCenters(scoped)).map((c) => c.id)).toEqual([
      center.id,
    ]);
    await expect(createHealthCenter(scoped, input)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
  it("rolls back the center if the audit foreign key fails", async () => {
    const code = randomUUID();
    await expect(
      createHealthCenter(
        { ...admin, id: randomUUID() },
        {
          name: "Centro rollback ficticio",
          code,
          address: "",
          phone: "",
          email: "",
        },
      ),
    ).rejects.toMatchObject({ code: "P2003" });
    expect(await prisma.healthCenter.count({ where: { code } })).toBe(0);
  });
});
