import { describe, expect, it } from "vitest";

import {
  requireExplicitStagingConfirmation,
  validateStagingEnvironment,
} from "./staging-environment";

const validEnvironment = {
  SCCVI_DEPLOYMENT_ENV: "STAGING",
  STAGING_DATABASE_ID: "10000000-0000-4000-8000-000000000001",
  APP_URL: "https://sccvi-staging.vercel.app",
  DATABASE_URL: "postgresql://runtime.invalid/postgres",
  DIRECT_URL: "postgresql://admin.invalid/postgres",
  NEXT_PUBLIC_SUPABASE_URL: "https://staging-project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-staging-placeholder",
  EMAIL_PROVIDER: "resend",
  EMAIL_API_KEY: "server-only-placeholder",
  EMAIL_FROM: "SCCVI <staging@example.invalid>",
};

describe("validateStagingEnvironment", () => {
  it("accepts an isolated staging configuration", () => {
    expect(validateStagingEnvironment(validEnvironment)).toMatchObject({
      SCCVI_DEPLOYMENT_ENV: "STAGING",
      APP_URL: "https://sccvi-staging.vercel.app",
    });
  });

  it.each(["DEVELOPMENT", "ISOLATED_TEST", "PRODUCTION"])(
    "rejects the %s deployment target",
    (target) => {
      expect(() =>
        validateStagingEnvironment({
          ...validEnvironment,
          SCCVI_DEPLOYMENT_ENV: target,
        }),
      ).toThrow("STAGING PREFLIGHT BLOCKED");
    },
  );

  it("rejects reuse of the isolated test database URL", () => {
    expect(() =>
      validateStagingEnvironment({
        ...validEnvironment,
        TEST_DATABASE_URL: validEnvironment.DATABASE_URL,
      }),
    ).toThrow("STAGING PREFLIGHT BLOCKED");
  });

  it("allows email to be explicitly disabled but rejects partial configuration", () => {
    expect(() =>
      validateStagingEnvironment({
        ...validEnvironment,
        EMAIL_PROVIDER: "",
        EMAIL_API_KEY: "",
        EMAIL_FROM: "",
      }),
    ).not.toThrow();
    expect(() =>
      validateStagingEnvironment({
        ...validEnvironment,
        EMAIL_API_KEY: "",
      }),
    ).toThrow("STAGING PREFLIGHT BLOCKED");
  });

  it("requires operation-specific confirmation", () => {
    expect(() =>
      requireExplicitStagingConfirmation({}, "CONFIRM", "approved"),
    ).toThrow("STAGING OPERATION BLOCKED");
    expect(() =>
      requireExplicitStagingConfirmation(
        { CONFIRM: "approved" },
        "CONFIRM",
        "approved",
      ),
    ).not.toThrow();
  });
});
