import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import {
  requireIsolatedTestDatabase,
  verifyIsolatedTestDatabase,
} from "../support/test-environment";

await verifyIsolatedTestDatabase();
const isolatedDatabaseUrl = requireIsolatedTestDatabase();
(globalThis as unknown as { prisma: PrismaClient }).prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: isolatedDatabaseUrl }),
});
