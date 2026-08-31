import {
  isCiEphemeralDatabaseEnvironment,
  validateCiEphemeralDatabaseEnvironment,
} from "./ci-ephemeral-database";

const testConfirmation = "isolated-fictional-test-data-only";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const testDatabaseIdentityQuery = `
  SELECT
    "environment",
    "identity"::text AS "identity",
    to_regclass('public.sccvi_development_database_identity')::text AS "developmentMarker",
    to_regclass('public.sccvi_staging_database_identity')::text AS "stagingMarker",
    to_regclass('public.sccvi_production_database_identity')::text AS "productionMarker"
  FROM public.sccvi_test_database_identity
  WHERE "singleton" = TRUE
  LIMIT 1
`;

export interface TestDatabaseConfiguration {
  databaseUrl: string;
  expectedIdentity: string;
}

export interface TestDatabaseIdentityRow {
  environment: string;
  identity: string;
  developmentMarker: string | null;
  stagingMarker: string | null;
  productionMarker: string | null;
}

interface QueryResult<Row> {
  rows: Row[];
}

export interface TestDatabaseIdentityQueryable {
  query<Row>(sql: string): Promise<QueryResult<Row>>;
}

type TestEnvironment = Record<string, string | undefined>;

export function validateTestDatabaseEnvironment(
  environment: TestEnvironment,
): TestDatabaseConfiguration {
  const databaseUrl = environment.TEST_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "LIVE TEST EXECUTION BLOCKED: TEST_DATABASE_URL is not configured.",
    );
  }
  if (environment.SCCVI_TEST_DATABASE_CONFIRMED !== testConfirmation) {
    throw new Error(
      "LIVE TEST EXECUTION BLOCKED: the isolated test database confirmation is missing.",
    );
  }
  if (isCiEphemeralDatabaseEnvironment(environment)) {
    validateCiEphemeralDatabaseEnvironment(environment);
  } else if (
    environment.NODE_ENV === "production" ||
    databaseUrl === environment.DATABASE_URL ||
    databaseUrl === environment.DIRECT_URL
  ) {
    throw new Error(
      "Unsafe test database configuration: refusing development/production database access.",
    );
  }

  const expectedIdentity = environment.TEST_DATABASE_ID;
  if (!expectedIdentity || !uuidPattern.test(expectedIdentity)) {
    throw new Error(
      "LIVE TEST EXECUTION BLOCKED: TEST_DATABASE_ID is missing or invalid.",
    );
  }

  return { databaseUrl, expectedIdentity: expectedIdentity.toLowerCase() };
}

export async function verifyPersistedTestDatabaseIdentity(
  queryable: TestDatabaseIdentityQueryable,
  expectedIdentity: string,
): Promise<void> {
  let result: QueryResult<TestDatabaseIdentityRow>;
  try {
    result = await queryable.query<TestDatabaseIdentityRow>(
      testDatabaseIdentityQuery,
    );
  } catch {
    throw new Error(
      "LIVE TEST EXECUTION BLOCKED: the database test identity marker cannot be verified.",
    );
  }

  const marker = result.rows[0];
  if (
    result.rows.length !== 1 ||
    marker?.environment !== "ISOLATED_TEST" ||
    marker.identity.toLowerCase() !== expectedIdentity.toLowerCase() ||
    marker.developmentMarker ||
    marker.stagingMarker ||
    marker.productionMarker
  ) {
    throw new Error(
      "LIVE TEST EXECUTION BLOCKED: the connected database is not the confirmed SCCVI isolated test database.",
    );
  }
}
