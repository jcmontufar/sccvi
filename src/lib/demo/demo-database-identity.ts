import {
  validateTestDatabaseEnvironment,
  verifyPersistedTestDatabaseIdentity,
  type TestDatabaseIdentityQueryable,
} from "@/lib/testing/test-database-identity";

const demoConfirmation = "functional-fictional-data-only";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const developmentDatabaseIdentityQuery = `
  SELECT "environment", "identity"::text AS "identity"
  FROM public.sccvi_development_database_identity
  WHERE "singleton" = TRUE
  LIMIT 1
`;

type Environment = Record<string, string | undefined>;

export type DemoDatabaseConfiguration = {
  target: "DEVELOPMENT" | "ISOLATED_TEST";
  databaseUrl: string;
  expectedIdentity: string;
};

export function validateDemoDatabaseEnvironment(
  environment: Environment,
): DemoDatabaseConfiguration {
  if (environment.SCCVI_DEMO_FIXTURES_CONFIRMED !== demoConfirmation) {
    throw new Error(
      "DEMO FIXTURES BLOCKED: the explicit fictional-data confirmation is missing.",
    );
  }
  if (
    environment.NODE_ENV === "production" ||
    ["STAGING", "PRODUCTION"].includes(environment.SCCVI_DEPLOYMENT_ENV ?? "")
  ) {
    throw new Error(
      "DEMO FIXTURES BLOCKED: staging and production targets are forbidden.",
    );
  }

  const target = environment.SCCVI_DEMO_TARGET;
  if (target === "ISOLATED_TEST") {
    const test = validateTestDatabaseEnvironment(environment);
    return {
      target,
      databaseUrl: test.databaseUrl,
      expectedIdentity: test.expectedIdentity,
    };
  }
  if (target !== "DEVELOPMENT") {
    throw new Error(
      "DEMO FIXTURES BLOCKED: SCCVI_DEMO_TARGET must be DEVELOPMENT or ISOLATED_TEST.",
    );
  }
  const databaseUrl = environment.DATABASE_URL;
  const expectedIdentity = environment.SCCVI_DEVELOPMENT_DATABASE_ID;
  if (!databaseUrl) {
    throw new Error(
      "DEMO FIXTURES BLOCKED: DATABASE_URL is not configured for development.",
    );
  }
  if (!expectedIdentity || !uuidPattern.test(expectedIdentity)) {
    throw new Error(
      "DEMO FIXTURES BLOCKED: SCCVI_DEVELOPMENT_DATABASE_ID is missing or invalid.",
    );
  }
  return {
    target,
    databaseUrl,
    expectedIdentity: expectedIdentity.toLowerCase(),
  };
}

export async function verifyDemoDatabaseIdentity(
  queryable: TestDatabaseIdentityQueryable,
  configuration: DemoDatabaseConfiguration,
) {
  if (configuration.target === "ISOLATED_TEST") {
    await verifyPersistedTestDatabaseIdentity(
      queryable,
      configuration.expectedIdentity,
    );
    return;
  }
  let rows: { environment: string; identity: string }[];
  try {
    rows = (
      await queryable.query<{ environment: string; identity: string }>(
        developmentDatabaseIdentityQuery,
      )
    ).rows;
  } catch {
    throw new Error(
      "DEMO FIXTURES BLOCKED: the persisted development identity marker cannot be verified.",
    );
  }
  if (
    rows.length !== 1 ||
    rows[0]?.environment !== "DEVELOPMENT" ||
    rows[0].identity.toLowerCase() !== configuration.expectedIdentity
  ) {
    throw new Error(
      "DEMO FIXTURES BLOCKED: the connected database is not the confirmed SCCVI development database.",
    );
  }
}
