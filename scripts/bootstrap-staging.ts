import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { z } from "zod";

import { PrismaClient } from "../src/generated/prisma/client";
import { verifyPersistedStagingDatabaseIdentity } from "../src/lib/staging/staging-database-identity";
import {
  requireExplicitStagingConfirmation,
  validateStagingEnvironment,
} from "../src/lib/staging/staging-environment";

config({ path: ".env.staging.local", quiet: true });

const action = process.argv[2] ?? "verify";
if (!new Set(["verify", "apply"]).has(action)) {
  throw new Error("Use verify or apply.");
}

const environment = validateStagingEnvironment(process.env);
const bootstrapSchema = z.object({
  STAGING_BOOTSTRAP_AUTH_USER_ID: z.uuid(),
  STAGING_BOOTSTRAP_USER_EMAIL: z.email(),
  STAGING_BOOTSTRAP_USER_FULL_NAME: z.string().min(1),
  STAGING_SMOKE_CHILD_ID: z.uuid(),
});
const bootstrapResult = bootstrapSchema.safeParse(process.env);
if (!bootstrapResult.success) {
  throw new Error(
    "STAGING BOOTSTRAP BLOCKED: controlled Auth/profile or smoke fixture identifiers are missing.",
  );
}
const bootstrap = bootstrapResult.data;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: environment.DIRECT_URL }),
});

async function verifyIdentity(queryable: {
  $queryRawUnsafe<Row>(sql: string): Promise<Row>;
}) {
  await verifyPersistedStagingDatabaseIdentity(
    {
      async query<Row>(sql: string) {
        return { rows: await queryable.$queryRawUnsafe<Row[]>(sql) };
      },
    },
    environment.STAGING_DATABASE_ID,
  );
}

async function verifyBootstrap() {
  const profile = await prisma.user.findUnique({
    where: { authUserId: bootstrap.STAGING_BOOTSTRAP_AUTH_USER_ID },
    include: { healthCenter: true },
  });
  const child = await prisma.child.findUnique({
    where: { id: bootstrap.STAGING_SMOKE_CHILD_ID },
    include: { community: true },
  });
  if (
    !profile?.isActive ||
    profile.role !== "HEALTH_STAFF" ||
    profile.email !== bootstrap.STAGING_BOOTSTRAP_USER_EMAIL ||
    profile.healthCenter?.code !== "SCCVI-STAGING" ||
    child?.fullName !== "[STAGING] Niño ficticio para pruebas de humo" ||
    child.community.healthCenterId !== profile.healthCenterId
  ) {
    throw new Error(
      "STAGING BOOTSTRAP BLOCKED: the controlled profile or minimal fictional fixture does not match.",
    );
  }
}

async function applyBootstrap() {
  requireExplicitStagingConfirmation(
    process.env,
    "SCCVI_STAGING_BOOTSTRAP_CONFIRMED",
    "create-minimal-fictional-staging-bootstrap",
  );
  await verifyIdentity(prisma);
  await prisma.$transaction(async (transaction) => {
    await verifyIdentity(transaction);
    const healthCenter = await transaction.healthCenter.upsert({
      where: { code: "SCCVI-STAGING" },
      update: { name: "Centro ficticio SCCVI Staging", isActive: true },
      create: {
        code: "SCCVI-STAGING",
        name: "Centro ficticio SCCVI Staging",
      },
    });
    const community = await transaction.community.upsert({
      where: {
        healthCenterId_name: {
          healthCenterId: healthCenter.id,
          name: "Validación técnica de staging",
        },
      },
      update: { isActive: true },
      create: {
        healthCenterId: healthCenter.id,
        name: "Validación técnica de staging",
      },
    });
    const profile = await transaction.user.upsert({
      where: { authUserId: bootstrap.STAGING_BOOTSTRAP_AUTH_USER_ID },
      update: {
        healthCenterId: healthCenter.id,
        fullName: bootstrap.STAGING_BOOTSTRAP_USER_FULL_NAME,
        email: bootstrap.STAGING_BOOTSTRAP_USER_EMAIL,
        role: "HEALTH_STAFF",
        isActive: true,
      },
      create: {
        authUserId: bootstrap.STAGING_BOOTSTRAP_AUTH_USER_ID,
        healthCenterId: healthCenter.id,
        fullName: bootstrap.STAGING_BOOTSTRAP_USER_FULL_NAME,
        email: bootstrap.STAGING_BOOTSTRAP_USER_EMAIL,
        role: "HEALTH_STAFF",
      },
    });
    const existingSmokeChild = await transaction.child.findUnique({
      where: { id: bootstrap.STAGING_SMOKE_CHILD_ID },
      select: { fullName: true },
    });
    if (
      existingSmokeChild &&
      existingSmokeChild.fullName !==
        "[STAGING] Niño ficticio para pruebas de humo"
    ) {
      throw new Error(
        "STAGING BOOTSTRAP BLOCKED: smoke child ID belongs to an unrecognized record.",
      );
    }
    await transaction.child.upsert({
      where: { id: bootstrap.STAGING_SMOKE_CHILD_ID },
      update: {
        communityId: community.id,
        fullName: "[STAGING] Niño ficticio para pruebas de humo",
        isActive: true,
      },
      create: {
        id: bootstrap.STAGING_SMOKE_CHILD_ID,
        communityId: community.id,
        fullName: "[STAGING] Niño ficticio para pruebas de humo",
        dateOfBirth: new Date("2026-01-01T00:00:00Z"),
        sex: "MALE",
      },
    });
    const existingAudit = await transaction.auditLog.findFirst({
      where: {
        userId: profile.id,
        action: "STAGING_BOOTSTRAP",
        entityType: "User",
        entityId: profile.id,
      },
      select: { id: true },
    });
    if (!existingAudit) {
      await transaction.auditLog.create({
        data: {
          userId: profile.id,
          action: "STAGING_BOOTSTRAP",
          entityType: "User",
          entityId: profile.id,
          metadata: { fixture: "SCCVI_STAGING_BOOTSTRAP_V1" },
        },
      });
    }
  });
}

async function main() {
  await verifyIdentity(prisma);
  if (action === "apply") await applyBootstrap();
  await verifyIdentity(prisma);
  await verifyBootstrap();
  console.info("Minimal staging bootstrap verified.");
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Staging bootstrap failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
