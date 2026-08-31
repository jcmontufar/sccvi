import { isCiEphemeralDatabaseEnvironment } from "./ci-ephemeral-database";
import {
  validateTestDatabaseEnvironment,
  verifyPersistedTestDatabaseIdentity,
  type TestDatabaseIdentityQueryable,
} from "./test-database-identity";

type Environment = Record<string, string | undefined>;

export async function verifyCiEphemeralDatabaseOperation(
  queryable: TestDatabaseIdentityQueryable,
  environment: Environment,
  operationDatabaseUrl: string,
) {
  if (!isCiEphemeralDatabaseEnvironment(environment)) return;
  const configuration = validateTestDatabaseEnvironment(environment);
  if (operationDatabaseUrl !== configuration.databaseUrl) {
    throw new Error(
      "CI EPHEMERAL TEST DATABASE BLOCKED: operation URL is not the confirmed job container.",
    );
  }
  await verifyPersistedTestDatabaseIdentity(
    queryable,
    configuration.expectedIdentity,
  );
}
