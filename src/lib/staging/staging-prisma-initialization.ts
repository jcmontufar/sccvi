export const stagingIdentityTable = "sccvi_staging_database_identity";
export const stagingMigrationGuardSchema =
  "sccvi_staging_prisma_initialization_guard";

export type PublicRelation = {
  name: string;
  kind: string;
  indexTable: string | null;
};

export type StagingSchemaInventory = {
  hasPrismaHistory: boolean;
  guardSchemaExists: boolean;
  publicRelations: PublicRelation[];
  publicRoutineCount: number;
  publicUserDefinedTypeCount: number;
};

export type StagingSchemaState = "MIGRATED" | "IDENTITY_ONLY";

export function classifyStagingSchemaInventory(
  inventory: StagingSchemaInventory,
): StagingSchemaState {
  if (inventory.guardSchemaExists) {
    throw new Error(
      "STAGING MIGRATION BLOCKED: an interrupted initialization guard schema requires manual review.",
    );
  }

  if (inventory.hasPrismaHistory) return "MIGRATED";

  const permittedRelations = inventory.publicRelations.every(
    (relation) =>
      (relation.name === stagingIdentityTable && relation.kind === "r") ||
      (relation.kind === "i" && relation.indexTable === stagingIdentityTable),
  );
  const identityTables = inventory.publicRelations.filter(
    (relation) =>
      relation.name === stagingIdentityTable && relation.kind === "r",
  );
  if (
    !permittedRelations ||
    identityTables.length !== 1 ||
    inventory.publicRoutineCount !== 0 ||
    inventory.publicUserDefinedTypeCount !== 0
  ) {
    throw new Error(
      "STAGING MIGRATION BLOCKED: an unmigrated database contains unexpected public objects.",
    );
  }

  return "IDENTITY_ONLY";
}
