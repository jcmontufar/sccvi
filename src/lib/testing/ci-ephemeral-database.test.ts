import { describe, expect, it } from "vitest";

import { validateCiEphemeralDatabaseEnvironment } from "./ci-ephemeral-database";

const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const baseEnvironment = {
  CI: "true",
  GITHUB_ACTIONS: "true",
  SCCVI_TEST_DATABASE_MODE: "CI_EPHEMERAL",
  SCCVI_CI_EPHEMERAL_DATABASE_CONFIRMED: "github-actions-job-container-only",
  TEST_DATABASE_URL: databaseUrl,
  DATABASE_URL: databaseUrl,
  DIRECT_URL: databaseUrl,
  TEST_DATABASE_ID: "10000000-0000-4000-8000-000000000001",
  E2E_SUPABASE_URL: "http://127.0.0.1:54321",
};

describe("validateCiEphemeralDatabaseEnvironment", () => {
  it("accepts an explicit GitHub Actions loopback container", () => {
    expect(validateCiEphemeralDatabaseEnvironment(baseEnvironment)).toEqual({
      databaseUrl,
      expectedIdentity: baseEnvironment.TEST_DATABASE_ID,
    });
  });

  it.each([
    { GITHUB_ACTIONS: "false" },
    { SCCVI_TEST_DATABASE_MODE: "ISOLATED_TEST" },
    { SCCVI_CI_EPHEMERAL_DATABASE_CONFIRMED: "" },
    { DATABASE_URL: "postgresql://different.invalid/postgres" },
    { DIRECT_URL: "postgresql://different.invalid/postgres" },
    { TEST_DATABASE_URL: "postgresql://hosted.supabase.co/postgres" },
    { E2E_SUPABASE_URL: "https://hosted.supabase.co" },
  ])("rejects non-ephemeral configuration %#", (override) => {
    expect(() =>
      validateCiEphemeralDatabaseEnvironment({
        ...baseEnvironment,
        ...override,
      }),
    ).toThrow("CI EPHEMERAL TEST DATABASE BLOCKED");
  });
});
