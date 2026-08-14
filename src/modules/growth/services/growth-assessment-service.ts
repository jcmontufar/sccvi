import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { ApplicationError } from "@/lib/errors/application-error";
import {
  calculateLmsZScore,
  normalizeLengthHeight,
  selectGrowthReference,
  type GrowthIndicator,
  type GrowthMeasurementMethod,
  zScoreToPercentile,
} from "@/modules/growth/services/growth-assessment-engine";
import { calculateExactAge } from "@/modules/growth/utils/exact-age";
import {
  WHO_MAX_AGE_DAYS,
  WHO_STANDARD_NAME,
  WHO_STANDARD_VERSION,
} from "@/modules/growth/who/who-standard";

type AssessmentChild = {
  dateOfBirth: Date;
  sex: "MALE" | "FEMALE";
};

type AssessmentRecord = {
  id: string;
  measurementDate: Date;
  weightKg: { toString(): string };
  heightCm: { toString(): string };
  measurementMethod: GrowthMeasurementMethod | null;
};

export async function calculateAndPersistGrowthAssessments(
  transaction: Prisma.TransactionClient,
  child: AssessmentChild,
  record: AssessmentRecord,
) {
  const ageDays = calculateExactAge(
    child.dateOfBirth.toISOString().slice(0, 10),
    record.measurementDate.toISOString().slice(0, 10),
  ).totalDays;
  if (ageDays > WHO_MAX_AGE_DAYS) {
    await transaction.growthAssessment.deleteMany({
      where: {
        growthRecordId: record.id,
        standardName: WHO_STANDARD_NAME,
        standardVersion: WHO_STANDARD_VERSION,
      },
    });
    return [];
  }

  const references = await transaction.growthReference.findMany({
    where: {
      standardName: WHO_STANDARD_NAME,
      standardVersion: WHO_STANDARD_VERSION,
      sex: child.sex,
      ageReference: ageDays,
      indicator: { in: ["WEIGHT_FOR_AGE", "HEIGHT_FOR_AGE"] },
    },
  });
  if (references.length !== 2) {
    throw new ApplicationError(
      "GROWTH_STANDARD_NOT_FOUND",
      "No se encontró la referencia OMS requerida para esta medición.",
    );
  }
  if (!record.measurementMethod) {
    throw new ApplicationError(
      "INVALID_GROWTH_MEASUREMENT",
      "Selecciona cómo se tomó la talla antes de calcular la evaluación.",
    );
  }

  const values: Record<GrowthIndicator, number> = {
    WEIGHT_FOR_AGE: Number(record.weightKg.toString()),
    HEIGHT_FOR_AGE: normalizeLengthHeight(
      Number(record.heightCm.toString()),
      ageDays,
      record.measurementMethod,
    ),
  };
  const calculatedAt = new Date();
  const selectableReferences = references.map((reference) => {
    if (
      reference.parameterL === null ||
      reference.parameterM === null ||
      reference.parameterS === null
    ) {
      throw new ApplicationError("GROWTH_STANDARD_NOT_FOUND");
    }
    return {
      standardName: reference.standardName,
      standardVersion: reference.standardVersion,
      sex: reference.sex,
      ageDays: Number(reference.ageReference),
      indicator: reference.indicator,
      l: Number(reference.parameterL),
      m: Number(reference.parameterM),
      s: Number(reference.parameterS),
    };
  });
  const selectedReferences = (
    ["WEIGHT_FOR_AGE", "HEIGHT_FOR_AGE"] as const
  ).map((indicator) =>
    selectGrowthReference(selectableReferences, {
      standardName: WHO_STANDARD_NAME,
      standardVersion: WHO_STANDARD_VERSION,
      sex: child.sex,
      ageDays,
      indicator,
    }),
  );

  return Promise.all(
    selectedReferences.map((reference) => {
      const zScore = calculateLmsZScore(values[reference.indicator], {
        indicator: reference.indicator,
        l: reference.l,
        m: reference.m,
        s: reference.s,
      });
      return transaction.growthAssessment.upsert({
        where: {
          growthRecordId_indicator_standardVersion: {
            growthRecordId: record.id,
            indicator: reference.indicator,
            standardVersion: WHO_STANDARD_VERSION,
          },
        },
        update: {
          zScore,
          percentile: zScoreToPercentile(zScore),
          classification: null,
          standardName: WHO_STANDARD_NAME,
          calculatedAt,
        },
        create: {
          growthRecordId: record.id,
          indicator: reference.indicator,
          zScore,
          percentile: zScoreToPercentile(zScore),
          classification: null,
          standardName: WHO_STANDARD_NAME,
          standardVersion: WHO_STANDARD_VERSION,
          calculatedAt,
        },
      });
    }),
  );
}
