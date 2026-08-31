import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  validateTestDatabaseEnvironment,
  verifyPersistedTestDatabaseIdentity,
} from "../src/lib/testing/test-database-identity";

const required = [
  "E2E_SUPABASE_URL",
  "E2E_SUPABASE_SERVICE_ROLE_KEY",
  "E2E_USER_EMAIL",
  "E2E_USER_PASSWORD",
  "E2E_EXISTING_CHILD_ID",
] as const;
if (required.some((name) => !process.env[name])) {
  throw new Error(
    "CI E2E FIXTURE BLOCKED: ephemeral Auth or fictional fixture configuration is missing.",
  );
}

const database = validateTestDatabaseEnvironment(process.env);
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: database.databaseUrl }),
});
const supabase = createClient(
  process.env.E2E_SUPABASE_URL!,
  process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);

async function resolveAuthUser() {
  const listed = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (listed.error) {
    throw new Error("CI E2E FIXTURE BLOCKED: ephemeral Auth is unavailable.");
  }
  const existing = listed.data.users.find(
    (user) => user.email === process.env.E2E_USER_EMAIL,
  );
  if (existing) return existing;

  const created = await supabase.auth.admin.createUser({
    email: process.env.E2E_USER_EMAIL!,
    password: process.env.E2E_USER_PASSWORD!,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    throw new Error(
      "CI E2E FIXTURE BLOCKED: controlled ephemeral Auth user was not created.",
    );
  }
  return created.data.user;
}

async function verifyIdentity(queryable: {
  $queryRawUnsafe<Row>(sql: string): Promise<Row>;
}) {
  await verifyPersistedTestDatabaseIdentity(
    {
      query: async <Row>(sql: string) => ({
        rows: await queryable.$queryRawUnsafe<Row[]>(sql),
      }),
    },
    database.expectedIdentity,
  );
}

async function main() {
  await verifyIdentity(prisma);
  const authUser = await resolveAuthUser();
  await prisma.$transaction(async (transaction) => {
    await verifyIdentity(transaction);
    const healthCenter = await transaction.healthCenter.upsert({
      where: { code: "SCCVI-CI-EPHEMERAL" },
      update: { name: "Centro ficticio CI efímero", isActive: true },
      create: {
        code: "SCCVI-CI-EPHEMERAL",
        name: "Centro ficticio CI efímero",
      },
    });
    const community = await transaction.community.upsert({
      where: {
        healthCenterId_name: {
          healthCenterId: healthCenter.id,
          name: "Comunidad ficticia CI efímera",
        },
      },
      update: { isActive: true },
      create: {
        healthCenterId: healthCenter.id,
        name: "Comunidad ficticia CI efímera",
      },
    });
    await transaction.user.upsert({
      where: { authUserId: authUser.id },
      update: {
        healthCenterId: healthCenter.id,
        fullName: "Usuario ficticio CI efímero",
        email: process.env.E2E_USER_EMAIL!,
        role: "ADMIN",
        isActive: true,
      },
      create: {
        authUserId: authUser.id,
        healthCenterId: healthCenter.id,
        fullName: "Usuario ficticio CI efímero",
        email: process.env.E2E_USER_EMAIL!,
        role: "ADMIN",
      },
    });
    const childId = process.env.E2E_EXISTING_CHILD_ID!;
    const existingChild = await transaction.child.findUnique({
      where: { id: childId },
      select: { fullName: true },
    });
    if (
      existingChild &&
      existingChild.fullName !== "Niño ficticio CI efímero"
    ) {
      throw new Error("CI E2E FIXTURE BLOCKED: fictional child ID collision.");
    }
    await transaction.child.upsert({
      where: { id: childId },
      update: {
        communityId: community.id,
        fullName: "Niño ficticio CI efímero",
        isActive: true,
      },
      create: {
        id: childId,
        communityId: community.id,
        fullName: "Niño ficticio CI efímero",
        dateOfBirth: new Date("2026-01-01T00:00:00Z"),
        sex: "MALE",
      },
    });
  });
  await verifyIdentity(prisma);
  console.info("Ephemeral CI Auth and fictional E2E fixture verified.");
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "CI E2E fixture setup failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
