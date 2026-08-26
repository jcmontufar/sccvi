import { config } from "dotenv";

config({ path: ".env.test.local", quiet: true });

const confirmation = "isolated-fictional-test-data-only";

export function requireIsolatedTestDatabase() {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error(
      "LIVE TEST EXECUTION BLOCKED: TEST_DATABASE_URL is not configured.",
    );
  }
  if (process.env.SCCVI_TEST_DATABASE_CONFIRMED !== confirmation) {
    throw new Error(
      "LIVE TEST EXECUTION BLOCKED: the isolated test database confirmation is missing.",
    );
  }
  if (
    process.env.NODE_ENV === "production" ||
    testDatabaseUrl === process.env.DATABASE_URL ||
    testDatabaseUrl === process.env.DIRECT_URL
  ) {
    throw new Error(
      "Unsafe test database configuration: refusing development/production database access.",
    );
  }
  return testDatabaseUrl;
}

export function requireE2EEnvironment() {
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
}
