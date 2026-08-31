const stagingIdentityQuery = `
  SELECT
    "environment",
    "identity"::text AS "identity",
    to_regclass('public.sccvi_development_database_identity')::text AS "developmentMarker",
    to_regclass('public.sccvi_test_database_identity')::text AS "testMarker",
    to_regclass('public.sccvi_production_database_identity')::text AS "productionMarker"
  FROM public.sccvi_staging_database_identity
  WHERE "singleton" = TRUE
  LIMIT 2
`;

type IdentityRow = {
  environment: string;
  identity: string;
  developmentMarker: string | null;
  testMarker: string | null;
  productionMarker: string | null;
};

interface QueryResult<Row> {
  rows: Row[];
}

export interface StagingIdentityQueryable {
  query<Row>(sql: string): Promise<QueryResult<Row>>;
}

export async function verifyPersistedStagingDatabaseIdentity(
  queryable: StagingIdentityQueryable,
  expectedIdentity: string,
) {
  let result: QueryResult<IdentityRow>;
  try {
    result = await queryable.query<IdentityRow>(stagingIdentityQuery);
  } catch {
    throw new Error(
      "STAGING OPERATION BLOCKED: the persisted staging database identity cannot be verified.",
    );
  }

  const marker = result.rows[0];
  if (
    result.rows.length !== 1 ||
    marker?.environment !== "STAGING" ||
    marker.identity.toLowerCase() !== expectedIdentity.toLowerCase()
  ) {
    throw new Error(
      "STAGING OPERATION BLOCKED: the connected database is not the confirmed SCCVI staging database.",
    );
  }

  if (
    marker.developmentMarker ||
    marker.testMarker ||
    marker.productionMarker
  ) {
    throw new Error(
      "STAGING OPERATION BLOCKED: a DEVELOPMENT, ISOLATED_TEST, or PRODUCTION identity marker is present.",
    );
  }
}
