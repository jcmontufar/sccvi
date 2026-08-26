import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import {
  childAccessResource,
  getChild,
} from "@/modules/children/services/child-service";
import {
  createGrowthRecordSchema,
  createGrowthCorrectionSchema,
  growthRecordIdSchema,
} from "@/modules/growth/schemas/growth-record-schema";
import { calculateAndPersistGrowthAssessments } from "@/modules/growth/services/growth-assessment-service";
import { referenceMedianForMeasurementMethod } from "@/modules/growth/services/growth-assessment-engine";
import {
  WHO_STANDARD_NAME,
  WHO_STANDARD_VERSION,
} from "@/modules/growth/who/who-standard";
import { calculateExactAge } from "@/modules/growth/utils/exact-age";

const growthRecordSelect = {
  id: true,
  childId: true,
  measuredByUserId: true,
  measurementDate: true,
  weightKg: true,
  heightCm: true,
  measurementMethod: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  measuredBy: { select: { fullName: true } },
  assessments: {
    select: {
      indicator: true,
      zScore: true,
      percentile: true,
      classification: true,
      standardName: true,
      standardVersion: true,
    },
    orderBy: { indicator: "asc" as const },
  },
  scheduledFollowUp: {
    select: { id: true, dueDate: true, completedAt: true },
  },
} as const;

function validateAfterBirth(dateOfBirth: Date, measurementDate: string) {
  const birthDate = dateOfBirth.toISOString().slice(0, 10);
  if (measurementDate < birthDate) {
    throw new ApplicationError(
      "INVALID_GROWTH_MEASUREMENT",
      "La fecha de medición no puede ser anterior al nacimiento.",
    );
  }
}

export async function listGrowthRecords(
  user: ApplicationUser,
  childId: string,
) {
  const child = await getChild(user, childId);
  authorize(user, "growth:list", childAccessResource(child));
  const records = await getPrisma().growthRecord.findMany({
    where: { childId: child.id },
    select: growthRecordSelect,
    orderBy: [{ measurementDate: "desc" }, { createdAt: "desc" }],
  });
  const birthDate = child.dateOfBirth.toISOString().slice(0, 10);
  const recordsWithAge = records.map((record) => ({
    ...record,
    exactAge: calculateExactAge(
      birthDate,
      record.measurementDate.toISOString().slice(0, 10),
    ),
  }));
  const references = await getPrisma().growthReference.findMany({
    where: {
      standardName: WHO_STANDARD_NAME,
      standardVersion: WHO_STANDARD_VERSION,
      sex: child.sex,
      ageReference: {
        in: [
          ...new Set(recordsWithAge.map(({ exactAge }) => exactAge.totalDays)),
        ],
      },
      indicator: { in: ["WEIGHT_FOR_AGE", "HEIGHT_FOR_AGE"] },
    },
    select: { ageReference: true, indicator: true, parameterM: true },
  });
  const referenceMap = new Map(
    references.map((reference) => [
      `${reference.indicator}:${reference.ageReference.toString()}`,
      reference.parameterM === null ? null : Number(reference.parameterM),
    ]),
  );
  return recordsWithAge.map((record) => {
    const weightMedian = referenceMap.get(
      `WEIGHT_FOR_AGE:${record.exactAge.totalDays}`,
    );
    const heightMedian = referenceMap.get(
      `HEIGHT_FOR_AGE:${record.exactAge.totalDays}`,
    );
    return {
      ...record,
      whoWeightMedianKg: weightMedian ?? null,
      whoHeightMedianCm:
        heightMedian !== null &&
        heightMedian !== undefined &&
        record.measurementMethod
          ? referenceMedianForMeasurementMethod(
              heightMedian,
              record.exactAge.totalDays,
              record.measurementMethod,
            )
          : null,
    };
  });
}

export async function createGrowthRecord(
  user: ApplicationUser,
  childId: string,
  input: unknown,
) {
  const child = await getChild(user, childId);
  authorize(user, "growth:create", childAccessResource(child));
  if (!child.isActive) {
    throw new ApplicationError(
      "INVALID_GROWTH_MEASUREMENT",
      "No se pueden registrar mediciones para un niño inactivo.",
    );
  }
  const data = createGrowthRecordSchema().parse(input);
  validateAfterBirth(child.dateOfBirth, data.measurementDate);

  return getPrisma().$transaction(async (transaction) => {
    const record = await transaction.growthRecord.create({
      data: {
        childId: child.id,
        measuredByUserId: user.id,
        measurementDate: new Date(`${data.measurementDate}T00:00:00.000Z`),
        weightKg: data.weightKg,
        heightCm: data.heightCm,
        measurementMethod: data.measurementMethod,
        notes: data.notes,
      },
      select: growthRecordSelect,
    });
    const laterRecord = data.nextFollowUpDate
      ? await transaction.growthRecord.findFirst({
          where: {
            childId: child.id,
            id: { not: record.id },
            measurementDate: { gt: record.measurementDate },
          },
          select: { id: true },
          orderBy: { measurementDate: "asc" },
        })
      : null;
    await transaction.growthFollowUp.updateMany({
      where: {
        childId: child.id,
        completedAt: null,
        sourceGrowthRecord: {
          measurementDate: { lt: record.measurementDate },
        },
      },
      data: {
        completedAt: new Date(),
        completedByGrowthRecordId: record.id,
      },
    });
    if (data.nextFollowUpDate) {
      await transaction.growthFollowUp.create({
        data: {
          childId: child.id,
          scheduledByUserId: user.id,
          sourceGrowthRecordId: record.id,
          dueDate: new Date(`${data.nextFollowUpDate}T00:00:00.000Z`),
          completedAt: laterRecord ? new Date() : undefined,
          completedByGrowthRecordId: laterRecord?.id,
        },
      });
    }
    await calculateAndPersistGrowthAssessments(transaction, child, record);
    await recordAuditEvent(transaction, {
      userId: user.id,
      action: "GROWTH_RECORD_CREATED",
      entityType: "GrowthRecord",
      entityId: record.id,
      metadata: { childId: child.id },
    });
    return record;
  });
}

export async function getGrowthRecord(
  user: ApplicationUser,
  childId: string,
  recordId: string,
) {
  const child = await getChild(user, childId);
  authorize(user, "growth:list", childAccessResource(child));
  const id = growthRecordIdSchema.parse(recordId);
  const record = await getPrisma().growthRecord.findFirst({
    where: { id, childId: child.id },
    select: growthRecordSelect,
  });
  if (!record) throw new ApplicationError("GROWTH_RECORD_NOT_FOUND");
  return record;
}

export async function correctGrowthRecord(
  user: ApplicationUser,
  childId: string,
  recordId: string,
  input: unknown,
) {
  const child = await getChild(user, childId);
  authorize(user, "growth:update", childAccessResource(child));
  const record = await getGrowthRecord(user, child.id, recordId);
  const data = createGrowthCorrectionSchema().parse(input);
  validateAfterBirth(child.dateOfBirth, data.measurementDate);
  const changedFields = [
    record.measurementDate.toISOString().slice(0, 10) !== data.measurementDate
      ? "measurementDate"
      : null,
    record.weightKg.toString() !== String(data.weightKg) ? "weightKg" : null,
    record.heightCm.toString() !== String(data.heightCm) ? "heightCm" : null,
    record.measurementMethod !== data.measurementMethod
      ? "measurementMethod"
      : null,
    (record.notes ?? "") !== (data.notes ?? "") ? "notes" : null,
  ].filter((value): value is string => Boolean(value));

  return getPrisma().$transaction(async (transaction) => {
    const corrected = await transaction.growthRecord.update({
      where: { id: record.id },
      data: {
        measurementDate: new Date(`${data.measurementDate}T00:00:00.000Z`),
        weightKg: data.weightKg,
        heightCm: data.heightCm,
        measurementMethod: data.measurementMethod,
        notes: data.notes,
      },
      select: growthRecordSelect,
    });
    await transaction.growthFollowUp.updateMany({
      where: {
        completedByGrowthRecordId: corrected.id,
        sourceGrowthRecord: {
          measurementDate: { gte: corrected.measurementDate },
        },
      },
      data: { completedAt: null, completedByGrowthRecordId: null },
    });
    await transaction.growthFollowUp.updateMany({
      where: {
        childId: child.id,
        completedAt: null,
        sourceGrowthRecord: {
          measurementDate: { lt: corrected.measurementDate },
        },
      },
      data: {
        completedAt: new Date(),
        completedByGrowthRecordId: corrected.id,
      },
    });
    await calculateAndPersistGrowthAssessments(transaction, child, corrected);
    await recordAuditEvent(transaction, {
      userId: user.id,
      action: "GROWTH_RECORD_CORRECTED",
      entityType: "GrowthRecord",
      entityId: record.id,
      metadata: {
        reason: data.correctionReason,
        changedFields,
        previousMeasurement: {
          measurementDate: record.measurementDate.toISOString().slice(0, 10),
          weightKg: record.weightKg.toString(),
          heightCm: record.heightCm.toString(),
          measurementMethod: record.measurementMethod,
        },
        correctedMeasurement: {
          measurementDate: data.measurementDate,
          weightKg: String(data.weightKg),
          heightCm: String(data.heightCm),
          measurementMethod: data.measurementMethod,
        },
      },
    });
    return corrected;
  });
}
