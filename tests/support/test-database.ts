import { Pool, type PoolClient } from "pg";

import {
  requireIsolatedTestDatabase,
  verifyIsolatedTestDatabase,
} from "./test-environment";

export async function cleanupCoreRegistryFixture(names: {
  community: string;
  guardian: string;
  child: string;
}) {
  const pool = new Pool({ connectionString: requireIsolatedTestDatabase() });
  const client = await pool.connect();
  try {
    await verifyIsolatedTestDatabase(client);
    await client.query("BEGIN");
    const community = await client.query<{ id: string }>(
      'SELECT "id" FROM "Community" WHERE "name" = $1 LIMIT 1',
      [names.community],
    );
    const guardians = await client.query<{ id: string }>(
      'SELECT "id" FROM "Guardian" WHERE "fullName" = $1',
      [names.guardian],
    );
    const children = await client.query<{ id: string }>(
      'SELECT "id" FROM "Child" WHERE "fullName" = $1',
      [names.child],
    );
    const guardianIds = guardians.rows.map(({ id }) => id);
    const childIds = children.rows.map(({ id }) => id);
    await client.query(
      'DELETE FROM "ChildGuardian" WHERE "childId" = ANY($1::uuid[]) OR "guardianId" = ANY($2::uuid[])',
      [childIds, guardianIds],
    );
    await client.query(
      'DELETE FROM "AuditLog" WHERE "entityType" = \'Child\' AND "entityId" = ANY($1::text[])',
      [childIds],
    );
    await client.query('DELETE FROM "Child" WHERE "id" = ANY($1::uuid[])', [
      childIds,
    ]);
    await client.query('DELETE FROM "Guardian" WHERE "id" = ANY($1::uuid[])', [
      guardianIds,
    ]);
    if (community.rows[0]) {
      await client.query('DELETE FROM "Community" WHERE "id" = $1', [
        community.rows[0].id,
      ]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function withVerifiedCleanup(
  cleanup: (client: PoolClient) => Promise<void>,
) {
  const pool = new Pool({ connectionString: requireIsolatedTestDatabase() });
  const client = await pool.connect();
  try {
    await verifyIsolatedTestDatabase(client);
    await client.query("BEGIN");
    await cleanup(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

export async function cleanupGrowthFixture(fixture: {
  childId: string;
  notes: string;
}) {
  await withVerifiedCleanup(async (client) => {
    const records = await client.query<{ id: string }>(
      'SELECT "id" FROM "GrowthRecord" WHERE "childId" = $1 AND "notes" = $2',
      [fixture.childId, fixture.notes],
    );
    const ids = records.rows.map(({ id }) => id);
    await client.query(
      'DELETE FROM "AuditLog" WHERE "entityType" = \'GrowthRecord\' AND "entityId" = ANY($1::text[])',
      [ids],
    );
    await client.query(
      'DELETE FROM "GrowthAssessment" WHERE "growthRecordId" = ANY($1::uuid[])',
      [ids],
    );
    await client.query(
      'DELETE FROM "GrowthRecord" WHERE "id" = ANY($1::uuid[])',
      [ids],
    );
  });
}

export async function cleanupVaccinationFixture(fixture: {
  childId: string;
  notes: string;
}) {
  await withVerifiedCleanup(async (client) => {
    const vaccinations = await client.query<{ id: string }>(
      'SELECT "id" FROM "Vaccination" WHERE "childId" = $1 AND "notes" = $2',
      [fixture.childId, fixture.notes],
    );
    const ids = vaccinations.rows.map(({ id }) => id);
    await client.query(
      'DELETE FROM "AuditLog" WHERE "entityType" = \'Vaccination\' AND "entityId" = ANY($1::text[])',
      [ids],
    );
    await client.query(
      'DELETE FROM "Vaccination" WHERE "id" = ANY($1::uuid[])',
      [ids],
    );
  });
}
