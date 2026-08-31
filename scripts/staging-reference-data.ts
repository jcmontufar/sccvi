import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { verifyPersistedStagingDatabaseIdentity } from "../src/lib/staging/staging-database-identity";
import {
  requireExplicitStagingConfirmation,
  validateStagingEnvironment,
} from "../src/lib/staging/staging-environment";
import {
  parseWhoReferenceCsv,
  sha256 as whoSha256,
  whoReferenceFiles,
} from "../src/modules/growth/who/who-standard";
import {
  guatemalaScheduleArtifact,
  parseGuatemalaScheduleArtifact,
  sha256 as vaccinationSha256,
} from "../src/modules/vaccination/schedule/guatemala-schedule";

config({ path: ".env.staging.local", quiet: true });

const action = process.argv[2] ?? "verify";
if (!new Set(["verify", "import"]).has(action)) {
  throw new Error("Use verify or import.");
}

const environment = validateStagingEnvironment(process.env);
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: environment.DIRECT_URL }),
});

async function verifyIdentity(queryable: {
  $queryRawUnsafe<Row>(sql: string): Promise<Row>;
}) {
  await verifyPersistedStagingDatabaseIdentity(
    {
      async query<Row>(sql: string) {
        return { rows: await queryable.$queryRawUnsafe<Row[]>(sql) };
      },
    },
    environment.STAGING_DATABASE_ID,
  );
}

async function loadApprovedArtifacts() {
  const whoRows = [];
  for (const [indicator, metadata] of Object.entries(whoReferenceFiles)) {
    const text = await readFile(
      resolve("prisma/data/who-2006", metadata.fileName),
      "utf8",
    );
    if (whoSha256(text) !== metadata.sha256) {
      throw new Error(`WHO artifact hash mismatch: ${metadata.fileName}.`);
    }
    whoRows.push(
      ...parseWhoReferenceCsv(
        text,
        indicator as keyof typeof whoReferenceFiles,
      ),
    );
  }
  if (whoRows.length !== 7_428) {
    throw new Error(
      "STAGING REFERENCE DATA BLOCKED: WHO must contain 7,428 rows.",
    );
  }

  const vaccinationText = await readFile(
    resolve("prisma/data/vaccination", guatemalaScheduleArtifact.fileName),
    "utf8",
  );
  if (vaccinationSha256(vaccinationText) !== guatemalaScheduleArtifact.sha256) {
    throw new Error(
      "STAGING REFERENCE DATA BLOCKED: vaccination hash mismatch.",
    );
  }
  const vaccination = parseGuatemalaScheduleArtifact(vaccinationText);
  if (
    vaccination.doses.length !== 21 ||
    vaccination.version.code !== "GT-MSPAS-2026-01-12"
  ) {
    throw new Error(
      "STAGING REFERENCE DATA BLOCKED: expected 21 doses and GT-MSPAS-2026-01-12.",
    );
  }
  return { whoRows, vaccination };
}

async function verifyExactReferenceData(
  database: Prisma.TransactionClient | PrismaClient,
) {
  const [
    whoCount,
    activeDoseCount,
    expectedVersionDoseCount,
    activeVersionCount,
    expectedActiveVersionCount,
  ] = await Promise.all([
    database.growthReference.count({
      where: {
        standardName: "WHO Child Growth Standards",
        standardVersion: "2006",
      },
    }),
    database.vaccineSchedule.count({ where: { isActive: true } }),
    database.vaccineSchedule.count({
      where: {
        isActive: true,
        scheduleVersion: "GT-MSPAS-2026-01-12",
      },
    }),
    database.vaccineScheduleVersion.count({ where: { isActive: true } }),
    database.vaccineScheduleVersion.count({
      where: { isActive: true, code: "GT-MSPAS-2026-01-12" },
    }),
  ]);
  if (
    whoCount !== 7_428 ||
    activeDoseCount !== 21 ||
    expectedVersionDoseCount !== 21 ||
    activeVersionCount !== 1 ||
    expectedActiveVersionCount !== 1
  ) {
    throw new Error(
      "STAGING REFERENCE DATA BLOCKED: persisted WHO/MSPAS counts or version do not match the approved artifacts.",
    );
  }
}

function normalizedName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es-GT");
}

async function importApprovedReferenceData() {
  requireExplicitStagingConfirmation(
    process.env,
    "SCCVI_STAGING_REFERENCE_DATA_CONFIRMED",
    "import-approved-reference-data-to-staging",
  );
  const artifacts = await loadApprovedArtifacts();
  await verifyIdentity(prisma);

  await prisma.$transaction(
    async (transaction) => {
      await verifyIdentity(transaction);
      await transaction.growthReference.deleteMany({
        where: {
          standardName: "WHO Child Growth Standards",
          standardVersion: "2006",
          indicator: { in: ["WEIGHT_FOR_AGE", "HEIGHT_FOR_AGE"] },
        },
      });
      await transaction.growthReference.createMany({
        data: artifacts.whoRows.map((row) => ({
          standardName: row.standardName,
          standardVersion: row.standardVersion,
          sex: row.sex,
          indicator: row.indicator,
          ageReference: row.ageDays,
          parameterL: row.l,
          parameterM: row.m,
          parameterS: row.s,
          additionalParameters:
            row.measurementMode === ""
              ? undefined
              : { measurementMode: row.measurementMode },
        })),
      });

      const artifact = artifacts.vaccination;
      const version = await transaction.vaccineScheduleVersion.upsert({
        where: { code: artifact.version.code },
        update: {
          name: artifact.version.name,
          authority: artifact.version.authority,
          publishedAt: new Date(`${artifact.version.publishedAt}T00:00:00Z`),
          effectiveFrom: new Date(
            `${artifact.version.effectiveFrom}T00:00:00Z`,
          ),
          effectiveTo: artifact.version.effectiveTo
            ? new Date(`${artifact.version.effectiveTo}T00:00:00Z`)
            : null,
          sourceUrl: artifact.version.sourceUrl,
          sourceSha256: artifact.version.sourceSha256,
          isActive: true,
        },
        create: {
          code: artifact.version.code,
          name: artifact.version.name,
          authority: artifact.version.authority,
          publishedAt: new Date(`${artifact.version.publishedAt}T00:00:00Z`),
          effectiveFrom: new Date(
            `${artifact.version.effectiveFrom}T00:00:00Z`,
          ),
          effectiveTo: artifact.version.effectiveTo
            ? new Date(`${artifact.version.effectiveTo}T00:00:00Z`)
            : null,
          sourceUrl: artifact.version.sourceUrl,
          sourceSha256: artifact.version.sourceSha256,
        },
      });

      const existingVaccines = await transaction.vaccine.findMany();
      const vaccineIds = new Map<string, string>();
      for (const vaccine of artifact.vaccines) {
        const recognizedNames = new Set(
          [vaccine.name, ...vaccine.aliases].map(normalizedName),
        );
        const matches = existingVaccines.filter(
          (candidate) =>
            candidate.officialCode === vaccine.code ||
            recognizedNames.has(normalizedName(candidate.name)),
        );
        if (matches.length > 1) {
          throw new Error(
            "STAGING REFERENCE DATA BLOCKED: duplicate vaccine identity detected.",
          );
        }
        const matched = matches[0];
        const saved = matched
          ? await transaction.vaccine.update({
              where: { id: matched.id },
              data: {
                officialCode: vaccine.code,
                name: vaccine.name,
                isActive: true,
              },
            })
          : await transaction.vaccine.create({
              data: {
                officialCode: vaccine.code,
                name: vaccine.name,
                description: `Vacuna incluida en ${artifact.version.name}.`,
              },
            });
        vaccineIds.set(vaccine.code, saved.id);
      }

      for (const dose of artifact.doses) {
        const vaccineId = vaccineIds.get(dose.vaccineCode);
        if (!vaccineId) {
          throw new Error(
            "STAGING REFERENCE DATA BLOCKED: vaccine not resolved.",
          );
        }
        await transaction.vaccineSchedule.upsert({
          where: {
            scheduleVersionId_doseCode: {
              scheduleVersionId: version.id,
              doseCode: dose.code,
            },
          },
          update: {
            vaccineId,
            doseName: dose.doseName,
            timingNote: dose.timingNote ?? null,
            doseNumber: dose.doseNumber,
            recommendedAgeMonths: dose.recommendedAgeMonths ?? null,
            recommendedAgeDays: dose.recommendedAgeDays ?? null,
            minimumAgeMonths: dose.minimumAgeMonths ?? null,
            minimumAgeDays: dose.minimumAgeDays ?? null,
            maximumAgeMonths: dose.maximumAgeMonths ?? null,
            maximumAgeDays: dose.maximumAgeDays ?? null,
            maximumAgeExclusive: dose.maximumAgeExclusive,
            scheduleName: artifact.version.name,
            scheduleVersion: artifact.version.code,
            isActive: true,
          },
          create: {
            vaccineId,
            scheduleVersionId: version.id,
            doseCode: dose.code,
            doseName: dose.doseName,
            timingNote: dose.timingNote ?? null,
            doseNumber: dose.doseNumber,
            recommendedAgeMonths: dose.recommendedAgeMonths,
            recommendedAgeDays: dose.recommendedAgeDays,
            minimumAgeMonths: dose.minimumAgeMonths,
            minimumAgeDays: dose.minimumAgeDays,
            maximumAgeMonths: dose.maximumAgeMonths,
            maximumAgeDays: dose.maximumAgeDays,
            maximumAgeExclusive: dose.maximumAgeExclusive,
            scheduleName: artifact.version.name,
            scheduleVersion: artifact.version.code,
          },
        });
      }
      await transaction.vaccineSchedule.updateMany({
        where: {
          scheduleVersionId: version.id,
          doseCode: { notIn: artifact.doses.map((dose) => dose.code) },
        },
        data: { isActive: false },
      });
      await transaction.vaccineSchedule.updateMany({
        where: { scheduleVersionId: { not: version.id } },
        data: { isActive: false },
      });
      await transaction.vaccineScheduleVersion.updateMany({
        where: { id: { not: version.id } },
        data: { isActive: false },
      });
      await verifyExactReferenceData(transaction);
    },
    { maxWait: 10_000, timeout: 120_000 },
  );
}

async function main() {
  await loadApprovedArtifacts();
  await verifyIdentity(prisma);
  if (action === "import") await importApprovedReferenceData();
  await verifyIdentity(prisma);
  await verifyExactReferenceData(prisma);
  console.info(
    "Staging reference data verified: WHO=7428, vaccination=21, version=GT-MSPAS-2026-01-12.",
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Staging reference data failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
