import { createHash } from "node:crypto";
import { Pool } from "pg";

import {
  requireIsolatedTestDatabase,
  verifyIsolatedTestDatabase,
} from "./test-environment";

export async function provisionCampaignE2EFixture() {
  const identity = createHash("sha256")
    .update(`sccvi-campaign-e2e:${process.env.TEST_DATABASE_ID}`)
    .digest("hex")
    .slice(0, 20);
  const identification = `SCCVI-E2E-${identity}`;
  const pool = new Pool({ connectionString: requireIsolatedTestDatabase() });
  const client = await pool.connect();
  let guardianId: string;
  try {
    await verifyIsolatedTestDatabase(client);
    await client.query("BEGIN");
    const child = await client.query<{ id: string; communityId: string }>(
      'SELECT "id", "communityId" FROM "Child" WHERE "id" = $1 AND "isActive" = TRUE',
      [process.env.E2E_EXISTING_CHILD_ID],
    );
    if (child.rows.length !== 1) {
      throw new Error(
        "LIVE TEST EXECUTION BLOCKED: the fictional campaign child is unavailable.",
      );
    }
    const existing = await client.query<{ id: string }>(
      'SELECT "id" FROM "Guardian" WHERE "identification" = $1',
      [identification],
    );
    if (existing.rows[0]) {
      guardianId = existing.rows[0].id;
      await client.query(
        `UPDATE "Guardian"
         SET "communityId" = $2, "isActive" = TRUE, "email" = $3,
             "preferredNotificationChannel" = 'EMAIL', "updatedAt" = now()
         WHERE "id" = $1`,
        [
          guardianId,
          child.rows[0].communityId,
          `campaign-${identity}@example.invalid`,
        ],
      );
    } else {
      const created = await client.query<{ id: string }>(
        `INSERT INTO "Guardian"
          ("id", "communityId", "fullName", "identification", "email",
           "preferredNotificationChannel", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'EMAIL', now(), now())
         RETURNING "id"`,
        [
          child.rows[0].communityId,
          "Tutor ficticio de campaña E2E",
          identification,
          `campaign-${identity}@example.invalid`,
        ],
      );
      guardianId = created.rows[0].id;
    }
    await client.query(
      `INSERT INTO "ChildGuardian"
        ("id", "childId", "guardianId", "relationshipType", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'Fixture E2E', now(), now())
       ON CONFLICT ("childId", "guardianId") DO NOTHING`,
      [child.rows[0].id, guardianId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }

  return async () => {
    const cleanupPool = new Pool({
      connectionString: requireIsolatedTestDatabase(),
    });
    const cleanupClient = await cleanupPool.connect();
    try {
      await verifyIsolatedTestDatabase(cleanupClient);
      await cleanupClient.query("BEGIN");
      await cleanupClient.query(
        'DELETE FROM "ChildGuardian" WHERE "guardianId" = $1',
        [guardianId],
      );
      await cleanupClient.query('DELETE FROM "Guardian" WHERE "id" = $1', [
        guardianId,
      ]);
      await cleanupClient.query("COMMIT");
    } catch (error) {
      await cleanupClient.query("ROLLBACK");
      throw error;
    } finally {
      cleanupClient.release();
      await cleanupPool.end();
    }
  };
}
