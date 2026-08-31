import { Pool } from "pg";

import { validateCiEphemeralDatabaseEnvironment } from "../src/lib/testing/ci-ephemeral-database";
import { verifyPersistedTestDatabaseIdentity } from "../src/lib/testing/test-database-identity";

const configuration = validateCiEphemeralDatabaseEnvironment(process.env);
const pool = new Pool({ connectionString: configuration.databaseUrl, max: 1 });

async function main() {
  const existing = await pool.query<{
    testMarker: string | null;
    developmentMarker: string | null;
    stagingMarker: string | null;
    productionMarker: string | null;
  }>(`
    SELECT
      to_regclass('public.sccvi_test_database_identity')::text AS "testMarker",
      to_regclass('public.sccvi_development_database_identity')::text AS "developmentMarker",
      to_regclass('public.sccvi_staging_database_identity')::text AS "stagingMarker",
      to_regclass('public.sccvi_production_database_identity')::text AS "productionMarker"
  `);
  const markers = existing.rows[0];
  if (
    !markers ||
    markers.testMarker ||
    markers.developmentMarker ||
    markers.stagingMarker ||
    markers.productionMarker
  ) {
    throw new Error(
      "CI EPHEMERAL TEST DATABASE BLOCKED: database is not a fresh unmarked job container.",
    );
  }

  await pool.query("BEGIN");
  try {
    await pool.query(`
      CREATE TABLE public.sccvi_test_database_identity (
        singleton boolean PRIMARY KEY DEFAULT TRUE CHECK (singleton),
        environment text NOT NULL CHECK (environment = 'ISOLATED_TEST'),
        identity uuid NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await pool.query(
      `INSERT INTO public.sccvi_test_database_identity
        (singleton, environment, identity)
       VALUES (TRUE, 'ISOLATED_TEST', $1::uuid)`,
      [configuration.expectedIdentity],
    );
    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }

  await verifyPersistedTestDatabaseIdentity(
    pool,
    configuration.expectedIdentity,
  );
  console.info(
    "Ephemeral ISOLATED_TEST database identity created and verified.",
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error
        ? error.message
        : "CI ephemeral database preparation failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
