import { describe, expect, it, vi } from "vitest";

import {
  validateTestDatabaseEnvironment,
  verifyPersistedTestDatabaseIdentity,
} from "./test-database-identity";

const isolatedId = "fd467c98-d917-4fe2-981d-80046b50dc9e";
const baseEnvironment = {
  TEST_DATABASE_URL: "postgresql://test.invalid/sccvi_test",
  TEST_DATABASE_ID: isolatedId,
  SCCVI_TEST_DATABASE_CONFIRMED: "isolated-fictional-test-data-only",
};

describe("test database isolation", () => {
  it("rejects the exact development database URL", () => {
    expect(() =>
      validateTestDatabaseEnvironment({
        ...baseEnvironment,
        DATABASE_URL: baseEnvironment.TEST_DATABASE_URL,
      }),
    ).toThrow("refusing development/production database access");
  });

  it("rejects an alternative URL to the same logical database by persisted identity", async () => {
    const configuration = validateTestDatabaseEnvironment({
      ...baseEnvironment,
      DATABASE_URL: "postgresql://direct.invalid/postgres",
      TEST_DATABASE_URL: "postgresql://pooler.invalid/postgres",
    });
    const query = vi.fn().mockResolvedValue({
      rows: [{ environment: "DEVELOPMENT", identity: isolatedId }],
    });

    await expect(
      verifyPersistedTestDatabaseIdentity(
        { query },
        configuration.expectedIdentity,
      ),
    ).rejects.toThrow("not the confirmed SCCVI isolated test database");
  });

  it("rejects a missing persisted marker", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });

    await expect(
      verifyPersistedTestDatabaseIdentity({ query }, isolatedId),
    ).rejects.toThrow("not the confirmed SCCVI isolated test database");
  });

  it("rejects the wrong persisted identity", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          environment: "ISOLATED_TEST",
          identity: "ee2b3584-e726-4a56-9900-54fb290e5852",
        },
      ],
    });

    await expect(
      verifyPersistedTestDatabaseIdentity({ query }, isolatedId),
    ).rejects.toThrow("not the confirmed SCCVI isolated test database");
  });

  it("accepts the correctly marked isolated database", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ environment: "ISOLATED_TEST", identity: isolatedId }],
    });

    await expect(
      verifyPersistedTestDatabaseIdentity({ query }, isolatedId),
    ).resolves.toBeUndefined();
  });
});
