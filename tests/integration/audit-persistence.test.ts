import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, describe, expect, it } from "vitest";

import { PrismaClient } from "@/generated/prisma/client";
import { requireIsolatedTestDatabase } from "../support/test-environment";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: requireIsolatedTestDatabase() }),
});
const createdIds: string[] = [];

afterAll(async () => {
  if (createdIds.length) {
    await prisma.auditLog.deleteMany({ where: { id: { in: createdIds } } });
  }
  await prisma.$disconnect();
});

describe("audit persistence", () => {
  it("persists and cleans an isolated fictional audit fixture", async () => {
    const entityId = randomUUID();
    const record = await prisma.auditLog.create({
      data: {
        action: "INTEGRATION_TEST_EVENT",
        entityType: "TestFixture",
        entityId,
        metadata: { fixture: true },
      },
    });
    createdIds.push(record.id);
    expect(
      await prisma.auditLog.findUnique({ where: { id: record.id } }),
    ).toMatchObject({ entityId, metadata: { fixture: true } });
  });
});
