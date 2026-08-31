import "dotenv/config";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { verifyCiEphemeralDatabaseOperation } from "../src/lib/testing/ci-ephemeral-database-operation";
import {
  parseWhoReferenceCsv,
  sha256,
  whoReferenceFiles,
} from "../src/modules/growth/who/who-standard";

const validateOnly = process.argv.includes("--validate-only");
const databaseUrl = process.env.DATABASE_URL;
const dataDirectory = resolve("prisma/data/who-2006");

async function loadRows() {
  const allRows = [];
  for (const [indicator, metadata] of Object.entries(whoReferenceFiles)) {
    const text = await readFile(
      resolve(dataDirectory, metadata.fileName),
      "utf8",
    );
    if (sha256(text) !== metadata.sha256) {
      throw new Error(`La suma SHA-256 no coincide para ${metadata.fileName}.`);
    }
    allRows.push(
      ...parseWhoReferenceCsv(
        text,
        indicator as keyof typeof whoReferenceFiles,
      ),
    );
  }
  return allRows;
}

async function main() {
  const rows = await loadRows();
  console.info(`Referencia OMS validada: ${rows.length} filas.`);
  if (validateOnly) return;
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
      await transaction.growthReference.deleteMany({
        where: {
          standardName: "WHO Child Growth Standards",
          standardVersion: "2006",
          indicator: { in: ["WEIGHT_FOR_AGE", "HEIGHT_FOR_AGE"] },
        },
      });
      await transaction.growthReference.createMany({
        data: rows.map((row) => ({
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
    });
    const imported = await prisma.growthReference.count({
      where: {
        standardName: "WHO Child Growth Standards",
        standardVersion: "2006",
      },
    });
    if (imported !== rows.length) {
      throw new Error(
        "La verificación posterior a la importación OMS no coincide.",
      );
    }
    console.info(`Referencia OMS importada: ${imported} filas.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Falló la importación de referencia OMS.",
  );
  process.exitCode = 1;
});
