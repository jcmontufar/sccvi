import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

import { config } from "dotenv";
import { Pool } from "pg";

import { verifyPersistedStagingDatabaseIdentity } from "../src/lib/staging/staging-database-identity";
import { verifyStagingDatabaseSecurity } from "../src/lib/staging/staging-database-security";
import {
  requireExplicitStagingConfirmation,
  validateStagingEnvironment,
} from "../src/lib/staging/staging-environment";
import {
  classifyStagingSchemaInventory,
  stagingIdentityTable,
  stagingMigrationGuardSchema,
  type PublicRelation,
} from "../src/lib/staging/staging-prisma-initialization";

config({ path: ".env.staging.local", quiet: true });

const action = process.argv[2] ?? "preflight";
if (!new Set(["preflight", "deploy"]).has(action)) {
  throw new Error("Use preflight or deploy.");
}

const environment = validateStagingEnvironment(process.env);
const pool = new Pool({ connectionString: environment.DIRECT_URL, max: 1 });

async function runCommand(
  command: string,
  args: string[],
  acceptedExitCodes: readonly number[] = [0],
) {
  const executable =
    process.platform === "win32" && ["npm", "npx"].includes(command)
      ? `${command}.cmd`
      : command;
  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(executable, args, {
      env: process.env,
      stdio: "inherit",
      shell: false,
    });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
  if (!acceptedExitCodes.includes(exitCode)) {
    throw new Error(
      `STAGING COMMAND BLOCKED: ${command} exited unsuccessfully.`,
    );
  }
}

async function runMigrationStatus(allowPending: boolean) {
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = await new Promise<{
    exitCode: number;
    output: string;
  }>((resolve, reject) => {
    const child = spawn(executable, ["prisma", "migrate", "status"], {
      env: process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    child.once("error", reject);
    child.once("exit", (code) => resolve({ exitCode: code ?? 1, output }));
  });
  const sanitizedOutput = result.output.replace(
    /postgres(?:ql)?:\/\/\S+/gi,
    "[REDACTED_DATABASE_URL]",
  );
  process.stdout.write(sanitizedOutput);
  const pendingOnly = /migration(?:s)? have not yet been applied/i.test(
    result.output,
  );
  if (result.exitCode !== 0 && !(allowPending && pendingOnly)) {
    throw new Error("STAGING MIGRATION BLOCKED: migrate status failed.");
  }
}

async function verifyMigrationHistory() {
  const localMigrations = (
    await readdir("prisma/migrations", {
      withFileTypes: true,
    })
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const table = await pool.query<{ tableName: string | null }>(
    `SELECT to_regclass('public._prisma_migrations')::text AS "tableName"`,
  );
  if (!table.rows[0]?.tableName) return;

  const applied = await pool.query<{
    migrationName: string;
    checksum: string;
    finishedAt: Date | null;
    rolledBackAt: Date | null;
  }>(`
    SELECT
      migration_name AS "migrationName",
      checksum,
      finished_at AS "finishedAt",
      rolled_back_at AS "rolledBackAt"
    FROM public._prisma_migrations
  `);
  for (const migration of applied.rows) {
    if (
      (!migration.finishedAt && !migration.rolledBackAt) ||
      !localMigrations.includes(migration.migrationName)
    ) {
      throw new Error(
        "STAGING MIGRATION BLOCKED: failed or unrecognized migration history detected.",
      );
    }
    if (migration.rolledBackAt) continue;
    const sql = await readFile(
      `prisma/migrations/${migration.migrationName}/migration.sql`,
    );
    const checksum = createHash("sha256").update(sql).digest("hex");
    if (checksum !== migration.checksum) {
      throw new Error(
        "STAGING MIGRATION BLOCKED: an applied migration differs from the repository.",
      );
    }
  }
  if (applied.rows.length > localMigrations.length) {
    throw new Error(
      "STAGING MIGRATION BLOCKED: failed or unrecognized migration history detected.",
    );
  }
}

async function verifyIdentity() {
  await verifyPersistedStagingDatabaseIdentity(
    pool,
    environment.STAGING_DATABASE_ID,
  );
}

async function inspectStagingSchema() {
  const metadata = await pool.query<{
    hasPrismaHistory: boolean;
    guardSchemaExists: boolean;
    publicRoutineCount: number;
    publicUserDefinedTypeCount: number;
  }>(`
    SELECT
      to_regclass('public._prisma_migrations') IS NOT NULL AS "hasPrismaHistory",
      to_regnamespace('${stagingMigrationGuardSchema}') IS NOT NULL AS "guardSchemaExists",
      (SELECT COUNT(*)::int
       FROM pg_proc AS routines
       JOIN pg_namespace AS namespaces ON namespaces.oid = routines.pronamespace
       WHERE namespaces.nspname = 'public') AS "publicRoutineCount",
      (SELECT COUNT(*)::int
       FROM pg_type AS types
       JOIN pg_namespace AS namespaces ON namespaces.oid = types.typnamespace
       WHERE namespaces.nspname = 'public'
         AND types.typtype IN ('d', 'e')) AS "publicUserDefinedTypeCount"
  `);
  const relations = await pool.query<PublicRelation>(`
    SELECT
      relations.relname AS "name",
      relations.relkind::text AS "kind",
      indexed_tables.relname AS "indexTable"
    FROM pg_class AS relations
    JOIN pg_namespace AS namespaces ON namespaces.oid = relations.relnamespace
    LEFT JOIN pg_index AS indexes ON indexes.indexrelid = relations.oid
    LEFT JOIN pg_class AS indexed_tables ON indexed_tables.oid = indexes.indrelid
    WHERE namespaces.nspname = 'public'
      AND relations.relkind IN ('r', 'p', 'v', 'm', 'S', 'f', 'i')
    ORDER BY relations.relname
  `);
  const row = metadata.rows[0];
  if (!row) {
    throw new Error("STAGING MIGRATION BLOCKED: schema inventory failed.");
  }
  return classifyStagingSchemaInventory({
    ...row,
    publicRelations: relations.rows,
  });
}

async function moveIdentityOutOfPublicSchema() {
  await pool.query("BEGIN");
  try {
    await pool.query(`CREATE SCHEMA ${stagingMigrationGuardSchema}`);
    await pool.query(
      `ALTER TABLE public.${stagingIdentityTable} SET SCHEMA ${stagingMigrationGuardSchema}`,
    );
    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

async function restoreAndHardenIdentity() {
  const marker = await pool.query<{ environment: string; identity: string }>(`
    SELECT "environment", "identity"::text AS "identity"
    FROM ${stagingMigrationGuardSchema}.${stagingIdentityTable}
    WHERE "singleton" = TRUE
    LIMIT 2
  `);
  if (
    marker.rows.length !== 1 ||
    marker.rows[0]?.environment !== "STAGING" ||
    marker.rows[0].identity.toLowerCase() !==
      environment.STAGING_DATABASE_ID.toLowerCase()
  ) {
    throw new Error(
      "STAGING MIGRATION BLOCKED: guarded staging identity changed during initialization.",
    );
  }

  await pool.query("BEGIN");
  try {
    await pool.query(
      `ALTER TABLE ${stagingMigrationGuardSchema}.${stagingIdentityTable} SET SCHEMA public`,
    );
    await pool.query(
      `ALTER TABLE public.${stagingIdentityTable} ENABLE ROW LEVEL SECURITY`,
    );
    await pool.query(
      `REVOKE ALL PRIVILEGES ON TABLE public.${stagingIdentityTable} FROM anon, authenticated`,
    );
    await pool.query(`DROP SCHEMA ${stagingMigrationGuardSchema}`);
    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

async function deployMigrations() {
  const state = await inspectStagingSchema();
  if (state === "MIGRATED") {
    await runCommand("npx", ["prisma", "migrate", "deploy"]);
    return;
  }

  await verifyIdentity();
  await moveIdentityOutOfPublicSchema();
  try {
    await runCommand("npx", ["prisma", "migrate", "deploy"]);
  } finally {
    await restoreAndHardenIdentity();
  }
}

async function main() {
  await verifyIdentity();
  console.info("Staging identity verified.");
  await runCommand("npm", ["run", "prisma:validate"]);
  await runCommand("npm", ["run", "prisma:generate"]);
  await runMigrationStatus(true);
  await verifyMigrationHistory();

  if (action === "preflight") {
    console.info(
      "Staging database preflight passed; no migration was applied.",
    );
    return;
  }

  requireExplicitStagingConfirmation(
    process.env,
    "SCCVI_STAGING_MIGRATION_CONFIRMED",
    "apply-reviewed-migrations-to-staging",
  );
  await verifyIdentity();
  await deployMigrations();
  await verifyIdentity();
  await runMigrationStatus(false);
  await verifyMigrationHistory();
  await verifyStagingDatabaseSecurity(pool);
  console.info("Staging migrations and post-migration security verified.");
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error
        ? error.message
        : "Staging database operation failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
