import { describe, expect, it } from "vitest";

import {
  stagingApplicationTables,
  verifyStagingDatabaseSecurity,
  type SecurityQueryable,
} from "./staging-database-security";

function queryable(rows: unknown[]): SecurityQueryable {
  return {
    async query<Row>() {
      return { rows: rows as Row[] };
    },
  };
}

const safeRows = stagingApplicationTables.map((tableName) => ({
  tableName,
  rlsEnabled: true,
  anonPrivileges: [],
  authenticatedPrivileges: [],
}));

describe("verifyStagingDatabaseSecurity", () => {
  it("accepts complete RLS and browser-role denial", async () => {
    await expect(
      verifyStagingDatabaseSecurity(queryable(safeRows)),
    ).resolves.toBeUndefined();
  });

  it("rejects a missing table", async () => {
    await expect(
      verifyStagingDatabaseSecurity(queryable(safeRows.slice(1))),
    ).rejects.toThrow("STAGING SECURITY VERIFICATION BLOCKED");
  });

  it("rejects disabled RLS", async () => {
    await expect(
      verifyStagingDatabaseSecurity(
        queryable([
          { ...safeRows[0], rlsEnabled: false },
          ...safeRows.slice(1),
        ]),
      ),
    ).rejects.toThrow("STAGING SECURITY VERIFICATION BLOCKED");
  });

  it("rejects browser-role privileges", async () => {
    await expect(
      verifyStagingDatabaseSecurity(
        queryable([
          { ...safeRows[0], authenticatedPrivileges: ["SELECT"] },
          ...safeRows.slice(1),
        ]),
      ),
    ).rejects.toThrow("STAGING SECURITY VERIFICATION BLOCKED");
  });
});
