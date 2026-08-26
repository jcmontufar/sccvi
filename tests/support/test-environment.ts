import { Pool, type PoolClient } from "pg";

import {
  validateTestDatabaseEnvironment,
  verifyPersistedTestDatabaseIdentity,
} from "../../src/lib/testing/test-database-identity";
import "./load-test-environment";

export function requireIsolatedTestDatabase() {
  return validateTestDatabaseEnvironment(process.env).databaseUrl;
}

export async function verifyIsolatedTestDatabase(
  existingClient?: PoolClient,
): Promise<void> {
  const configuration = validateTestDatabaseEnvironment(process.env);
  if (existingClient) {
    await verifyPersistedTestDatabaseIdentity(
      existingClient,
      configuration.expectedIdentity,
    );
    return;
  }

  const pool = new Pool({ connectionString: configuration.databaseUrl });
  const client = await pool.connect();
  try {
    await verifyPersistedTestDatabaseIdentity(
      client,
      configuration.expectedIdentity,
    );
  } finally {
    client.release();
    await pool.end();
  }
}

export async function requireE2EEnvironment() {
  requireIsolatedTestDatabase();
  if (process.env.E2E_TARGET_CONFIRMED !== "isolated-test-application-only") {
    throw new Error(
      "LIVE TEST EXECUTION BLOCKED: the isolated E2E target confirmation is missing.",
    );
  }
  const required = [
    "E2E_USER_EMAIL",
    "E2E_USER_PASSWORD",
    "E2E_SUPABASE_URL",
    "E2E_SUPABASE_ANON_KEY",
    "E2E_EXISTING_CHILD_ID",
  ] as const;
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(
      `LIVE TEST EXECUTION BLOCKED: missing ${missing.join(", ")}.`,
    );
  }
  await verifyIsolatedTestDatabase();
}
