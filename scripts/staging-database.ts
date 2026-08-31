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
  await runCommand("npx", ["prisma", "migrate", "deploy"]);
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
