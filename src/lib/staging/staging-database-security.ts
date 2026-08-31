export const stagingApplicationTables = [
  "HealthCenter",
  "User",
  "Community",
  "Guardian",
  "Child",
  "ChildGuardian",
  "GrowthRecord",
  "GrowthAssessment",
  "GrowthReference",
  "GrowthFollowUp",
  "Vaccine",
  "VaccineScheduleVersion",
  "VaccineSchedule",
  "Vaccination",
  "Alert",
  "Notification",
  "Campaign",
  "CampaignRecipient",
  "QRToken",
  "AuditLog",
] as const;

type SecurityRow = {
  tableName: string;
  rlsEnabled: boolean;
  anonPrivileges: string[] | null;
  authenticatedPrivileges: string[] | null;
};

interface QueryResult<Row> {
  rows: Row[];
}

export interface SecurityQueryable {
  query<Row>(sql: string, values?: unknown[]): Promise<QueryResult<Row>>;
}

export async function verifyStagingDatabaseSecurity(
  queryable: SecurityQueryable,
) {
  const result = await queryable.query<SecurityRow>(
    `
      SELECT
        tables.relname AS "tableName",
        tables.relrowsecurity AS "rlsEnabled",
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT privileges.privilege_type)
          FILTER (WHERE privileges.grantee = 'anon'), NULL) AS "anonPrivileges",
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT privileges.privilege_type)
          FILTER (WHERE privileges.grantee = 'authenticated'), NULL) AS "authenticatedPrivileges"
      FROM pg_class AS tables
      JOIN pg_namespace AS namespaces ON namespaces.oid = tables.relnamespace
      LEFT JOIN information_schema.role_table_grants AS privileges
        ON privileges.table_schema = namespaces.nspname
        AND privileges.table_name = tables.relname
        AND privileges.grantee IN ('anon', 'authenticated')
      WHERE namespaces.nspname = 'public'
        AND tables.relname = ANY($1::text[])
        AND tables.relkind = 'r'
      GROUP BY tables.relname, tables.relrowsecurity
    `,
    [[...stagingApplicationTables]],
  );

  const rows = new Map(result.rows.map((row) => [row.tableName, row]));
  const unsafe = stagingApplicationTables.filter((tableName) => {
    const row = rows.get(tableName);
    return (
      !row?.rlsEnabled ||
      Boolean(row.anonPrivileges?.length) ||
      Boolean(row.authenticatedPrivileges?.length)
    );
  });

  if (unsafe.length) {
    throw new Error(
      "STAGING SECURITY VERIFICATION BLOCKED: application tables are missing or exposed to Supabase browser roles.",
    );
  }
}
