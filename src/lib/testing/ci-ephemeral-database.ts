const ciEphemeralConfirmation = "github-actions-job-container-only";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Environment = Record<string, string | undefined>;

export type CiEphemeralDatabaseConfiguration = {
  databaseUrl: string;
  expectedIdentity: string;
};

function isLoopbackUrl(value: string, protocol: "postgres" | "http") {
  try {
    const url = new URL(value);
    const expectedProtocols =
      protocol === "postgres" ? ["postgres:", "postgresql:"] : ["http:"];
    return (
      expectedProtocols.includes(url.protocol) &&
      ["127.0.0.1", "localhost"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

export function validateCiEphemeralDatabaseEnvironment(
  environment: Environment,
): CiEphemeralDatabaseConfiguration {
  const databaseUrl = environment.TEST_DATABASE_URL;
  const expectedIdentity = environment.TEST_DATABASE_ID;
  if (
    environment.CI !== "true" ||
    environment.GITHUB_ACTIONS !== "true" ||
    environment.SCCVI_TEST_DATABASE_MODE !== "CI_EPHEMERAL" ||
    environment.SCCVI_CI_EPHEMERAL_DATABASE_CONFIRMED !==
      ciEphemeralConfirmation ||
    !databaseUrl ||
    !isLoopbackUrl(databaseUrl, "postgres") ||
    environment.DATABASE_URL !== databaseUrl ||
    environment.DIRECT_URL !== databaseUrl ||
    !expectedIdentity ||
    !uuidPattern.test(expectedIdentity) ||
    !environment.E2E_SUPABASE_URL ||
    !isLoopbackUrl(environment.E2E_SUPABASE_URL, "http")
  ) {
    throw new Error(
      "CI EPHEMERAL TEST DATABASE BLOCKED: GitHub Actions loopback container configuration is missing or invalid.",
    );
  }
  return {
    databaseUrl,
    expectedIdentity: expectedIdentity.toLowerCase(),
  };
}

export function isCiEphemeralDatabaseEnvironment(environment: Environment) {
  return environment.SCCVI_TEST_DATABASE_MODE === "CI_EPHEMERAL";
}
