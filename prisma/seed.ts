import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "Development seed requires DATABASE_URL for a confirmed non-production PostgreSQL database.",
  );
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const fictionalCommunities = ["El Rosario", "La Esperanza", "San José"];

async function main() {
  const healthCenter = await prisma.healthCenter.upsert({
    where: { code: "SCCVI-DEMO" },
    update: {
      name: "Centro Municipal SCCVI",
      isActive: true,
    },
    create: {
      code: "SCCVI-DEMO",
      name: "Centro Municipal SCCVI",
    },
  });

  await Promise.all(
    fictionalCommunities.map((name) =>
      prisma.community.upsert({
        where: {
          healthCenterId_name: {
            healthCenterId: healthCenter.id,
            name,
          },
        },
        update: { isActive: true },
        create: {
          healthCenterId: healthCenter.id,
          name,
        },
      }),
    ),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error("Development seed failed.", error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
