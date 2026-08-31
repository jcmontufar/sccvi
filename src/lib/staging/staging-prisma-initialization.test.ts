import { describe, expect, it } from "vitest";

import {
  classifyStagingSchemaInventory,
  stagingIdentityTable,
  type StagingSchemaInventory,
} from "./staging-prisma-initialization";

const identityOnly: StagingSchemaInventory = {
  hasPrismaHistory: false,
  guardSchemaExists: false,
  publicRelations: [
    { name: stagingIdentityTable, kind: "r", indexTable: null },
    {
      name: "sccvi_staging_database_identity_pkey",
      kind: "i",
      indexTable: stagingIdentityTable,
    },
    {
      name: "sccvi_staging_database_identity_identity_key",
      kind: "i",
      indexTable: stagingIdentityTable,
    },
  ],
  publicRoutineCount: 0,
  publicUserDefinedTypeCount: 0,
};

describe("classifyStagingSchemaInventory", () => {
  it("permits only the staging marker and its owned indexes for first deploy", () => {
    expect(classifyStagingSchemaInventory(identityOnly)).toBe("IDENTITY_ONLY");
  });

  it("uses the normal idempotent path when Prisma history exists", () => {
    expect(
      classifyStagingSchemaInventory({
        ...identityOnly,
        hasPrismaHistory: true,
        publicRelations: [
          ...identityOnly.publicRelations,
          { name: "Child", kind: "r", indexTable: null },
        ],
      }),
    ).toBe("MIGRATED");
  });

  it.each([
    {
      label: "an unexpected table",
      patch: {
        publicRelations: [
          ...identityOnly.publicRelations,
          { name: "unexpected", kind: "r", indexTable: null },
        ],
      },
    },
    {
      label: "an unexpected index",
      patch: {
        publicRelations: [
          ...identityOnly.publicRelations,
          { name: "unexpected_idx", kind: "i", indexTable: "unexpected" },
        ],
      },
    },
    { label: "a public routine", patch: { publicRoutineCount: 1 } },
    {
      label: "a public enum or domain",
      patch: { publicUserDefinedTypeCount: 1 },
    },
    {
      label: "a leftover guard schema",
      patch: { guardSchemaExists: true },
    },
  ])("fails closed for $label", ({ patch }) => {
    expect(() =>
      classifyStagingSchemaInventory({ ...identityOnly, ...patch }),
    ).toThrow(/STAGING MIGRATION BLOCKED/);
  });

  it("fails closed when the identity marker is absent", () => {
    expect(() =>
      classifyStagingSchemaInventory({
        ...identityOnly,
        publicRelations: [],
      }),
    ).toThrow(/unexpected public objects/);
  });
});
