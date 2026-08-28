import { describe, expect, it } from "vitest";

import {
  validateDemoDatabaseEnvironment,
  verifyDemoDatabaseIdentity,
} from "@/lib/demo/demo-database-identity";

const id = "3b8cf3d8-e552-4a4d-879c-f606bb12c4ab";
const base = {
  SCCVI_DEMO_TARGET: "DEVELOPMENT",
  SCCVI_DEMO_FIXTURES_CONFIRMED: "functional-fictional-data-only",
  SCCVI_DEVELOPMENT_DATABASE_ID: id,
  DATABASE_URL: "postgresql://demo.invalid/sccvi",
};

describe("demo database identity guard", () => {
  it("rejects production and staging even with confirmation", () => {
    expect(() =>
      validateDemoDatabaseEnvironment({ ...base, NODE_ENV: "production" }),
    ).toThrow("forbidden");
    expect(() =>
      validateDemoDatabaseEnvironment({
        ...base,
        SCCVI_DEPLOYMENT_ENV: "STAGING",
      }),
    ).toThrow("forbidden");
  });

  it("rejects confirmation without a persisted identity configuration", () => {
    expect(() =>
      validateDemoDatabaseEnvironment({
        ...base,
        SCCVI_DEVELOPMENT_DATABASE_ID: undefined,
      }),
    ).toThrow("missing or invalid");
  });

  it("fails closed for missing, wrong or unreadable development markers", async () => {
    const configuration = validateDemoDatabaseEnvironment(base);
    await expect(
      verifyDemoDatabaseIdentity(
        { query: async () => ({ rows: [] }) },
        configuration,
      ),
    ).rejects.toThrow("not the confirmed");
    await expect(
      verifyDemoDatabaseIdentity(
        {
          query: async <Row>() => ({
            rows: [
              { environment: "DEVELOPMENT", identity: crypto.randomUUID() },
            ] as unknown as Row[],
          }),
        },
        configuration,
      ),
    ).rejects.toThrow("not the confirmed");
    await expect(
      verifyDemoDatabaseIdentity(
        { query: async () => Promise.reject(new Error("missing")) },
        configuration,
      ),
    ).rejects.toThrow("cannot be verified");
  });

  it("accepts only the matching persisted development identity", async () => {
    const configuration = validateDemoDatabaseEnvironment(base);
    await expect(
      verifyDemoDatabaseIdentity(
        {
          query: async <Row>() => ({
            rows: [
              { environment: "DEVELOPMENT", identity: id },
            ] as unknown as Row[],
          }),
        },
        configuration,
      ),
    ).resolves.toBeUndefined();
  });
});
