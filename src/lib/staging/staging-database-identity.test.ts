import { describe, expect, it } from "vitest";

import {
  verifyPersistedStagingDatabaseIdentity,
  type StagingIdentityQueryable,
} from "./staging-database-identity";

const identity = "10000000-0000-4000-8000-000000000001";

function queryable(rows: unknown[]): StagingIdentityQueryable {
  return {
    async query<Row>() {
      return { rows: rows as Row[] };
    },
  };
}

const validRow = {
  environment: "STAGING",
  identity,
  developmentMarker: null,
  testMarker: null,
  productionMarker: null,
};

describe("verifyPersistedStagingDatabaseIdentity", () => {
  it("accepts exactly one matching staging marker", async () => {
    await expect(
      verifyPersistedStagingDatabaseIdentity(queryable([validRow]), identity),
    ).resolves.toBeUndefined();
  });

  it.each(["DEVELOPMENT", "ISOLATED_TEST", "PRODUCTION"])(
    "rejects environment %s",
    async (environment) => {
      await expect(
        verifyPersistedStagingDatabaseIdentity(
          queryable([{ ...validRow, environment }]),
          identity,
        ),
      ).rejects.toThrow("not the confirmed SCCVI staging database");
    },
  );

  it("rejects a mismatched UUID", async () => {
    await expect(
      verifyPersistedStagingDatabaseIdentity(
        queryable([validRow]),
        "20000000-0000-4000-8000-000000000002",
      ),
    ).rejects.toThrow("not the confirmed SCCVI staging database");
  });

  it("rejects conflicting persisted markers", async () => {
    await expect(
      verifyPersistedStagingDatabaseIdentity(
        queryable([
          { ...validRow, testMarker: "sccvi_test_database_identity" },
        ]),
        identity,
      ),
    ).rejects.toThrow("ISOLATED_TEST");
  });

  it("fails closed when the query fails", async () => {
    await expect(
      verifyPersistedStagingDatabaseIdentity(
        { query: async () => Promise.reject(new Error("connection")) },
        identity,
      ),
    ).rejects.toThrow("cannot be verified");
  });
});
