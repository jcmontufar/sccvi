import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { PrismaClient } from "../src/generated/prisma/client";
import { verifyCiEphemeralDatabaseOperation } from "../src/lib/testing/ci-ephemeral-database-operation";
import {
  guatemalaScheduleArtifact,
  parseGuatemalaScheduleArtifact,
  sha256,
} from "../src/modules/vaccination/schedule/guatemala-schedule";

config({ path: ".env.local" });
config();

const validateOnly = process.argv.includes("--validate-only");

function normalizedName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es-GT");
}

async function loadArtifact() {
  const text = await readFile(
    resolve("prisma/data/vaccination", guatemalaScheduleArtifact.fileName),
    "utf8",
  );
  if (sha256(text) !== guatemalaScheduleArtifact.sha256) {
    throw new Error(
      `La suma SHA-256 no coincide para ${guatemalaScheduleArtifact.fileName}.`,
    );
  }
  return parseGuatemalaScheduleArtifact(text);
}

async function main() {
  const artifact = await loadArtifact();
  console.info(
    `Esquema de vacunación validado: ${artifact.doses.length} dosis, versión ${artifact.version.code}.`,
  );
  if (validateOnly) return;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "La importación requiere DATABASE_URL del entorno de desarrollo confirmado.",
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
  try {
    await verifyCiEphemeralDatabaseOperation(
      {
        query: async <Row>(sql: string) => ({
          rows: await prisma.$queryRawUnsafe<Row[]>(sql),
        }),
      },
      process.env,
      databaseUrl,
    );
    await prisma.$transaction(async (transaction) => {
      await verifyCiEphemeralDatabaseOperation(
        {
          query: async <Row>(sql: string) => ({
            rows: await transaction.$queryRawUnsafe<Row[]>(sql),
          }),
        },
        process.env,
        databaseUrl,
      );
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
            `El catálogo contiene identidades duplicadas para ${vaccine.name}.`,
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
          throw new Error(`No se resolvió la vacuna ${dose.vaccineCode}.`);
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
    });

    const imported = await prisma.vaccineSchedule.count({
      where: {
        scheduleVersion: artifact.version.code,
        isActive: true,
      },
    });
    if (imported !== artifact.doses.length) {
      throw new Error(
        "La verificación posterior a la importación del esquema no coincide.",
      );
    }
    console.info(`Esquema de vacunación importado: ${imported} dosis.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Falló la importación del esquema de vacunación.",
  );
  process.exitCode = 1;
});
