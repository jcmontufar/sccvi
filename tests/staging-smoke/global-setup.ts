import { config } from "dotenv";
import { Pool } from "pg";

import { verifyPersistedStagingDatabaseIdentity } from "../../src/lib/staging/staging-database-identity";
import { validateStagingEnvironment } from "../../src/lib/staging/staging-environment";

config({ path: ".env.staging.local", quiet: true });

export default async function globalSetup() {
  const environment = validateStagingEnvironment(process.env);
  const requiredSmokeVariables = [
    "STAGING_SMOKE_USER_EMAIL",
    "STAGING_SMOKE_USER_PASSWORD",
    "STAGING_SMOKE_CHILD_ID",
  ] as const;
  if (requiredSmokeVariables.some((name) => !process.env[name])) {
    throw new Error(
      "STAGING SMOKE BLOCKED: controlled smoke credentials or fixture ID are missing.",
    );
  }

  const pool = new Pool({ connectionString: environment.DIRECT_URL, max: 1 });
  try {
    await verifyPersistedStagingDatabaseIdentity(
      pool,
      environment.STAGING_DATABASE_ID,
    );
    const referenceData = await pool.query<{
      whoCount: number;
      activeDoseCount: number;
      expectedVersionDoseCount: number;
      activeVersionCount: number;
      expectedActiveVersionCount: number;
    }>(`
      SELECT
        (SELECT COUNT(*)::int FROM "GrowthReference"
          WHERE "standardName" = 'WHO Child Growth Standards'
            AND "standardVersion" = '2006') AS "whoCount",
        (SELECT COUNT(*)::int FROM "VaccineSchedule"
          WHERE "isActive" = TRUE) AS "activeDoseCount",
        (SELECT COUNT(*)::int FROM "VaccineSchedule"
          WHERE "isActive" = TRUE
            AND "scheduleVersion" = 'GT-MSPAS-2026-01-12') AS "expectedVersionDoseCount",
        (SELECT COUNT(*)::int FROM "VaccineScheduleVersion"
          WHERE "isActive" = TRUE) AS "activeVersionCount",
        (SELECT COUNT(*)::int FROM "VaccineScheduleVersion"
          WHERE "isActive" = TRUE
            AND "code" = 'GT-MSPAS-2026-01-12') AS "expectedActiveVersionCount"
    `);
    const counts = referenceData.rows[0];
    if (
      counts?.whoCount !== 7_428 ||
      counts.activeDoseCount !== 21 ||
      counts.expectedVersionDoseCount !== 21 ||
      counts.activeVersionCount !== 1 ||
      counts.expectedActiveVersionCount !== 1
    ) {
      throw new Error(
        "STAGING SMOKE BLOCKED: WHO/MSPAS counts or version do not match.",
      );
    }
    console.info(
      environment.EMAIL_PROVIDER
        ? "Staging notification configuration is complete; smoke will not send email."
        : "Staging notification provider is disabled; smoke will not send email.",
    );
  } finally {
    await pool.end();
  }
}
