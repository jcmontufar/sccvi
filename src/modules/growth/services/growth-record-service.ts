import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import {
  childAccessResource,
  getChild,
} from "@/modules/children/services/child-service";
import {
  createGrowthRecordSchema,
  growthCorrectionSchema,
  growthRecordIdSchema,
} from "@/modules/growth/schemas/growth-record-schema";
import { calculateExactAge } from "@/modules/growth/utils/exact-age";

const growthRecordSelect = {
  id: true,
  childId: true,
  measuredByUserId: true,
  measurementDate: true,
  weightKg: true,
  heightCm: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  measuredBy: { select: { fullName: true } },
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
  return records.map((record) => ({
    ...record,
    exactAge: calculateExactAge(
      birthDate,
      record.measurementDate.toISOString().slice(0, 10),
    ),
  }));
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
        notes: data.notes,
      },
      select: growthRecordSelect,
    });
    await transaction.auditLog.create({
      data: {
        userId: user.id,
        action: "GROWTH_RECORD_CREATED",
        entityType: "GrowthRecord",
        entityId: record.id,
        metadata: { childId: child.id },
      },
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
  const data = growthCorrectionSchema.parse(input);
  validateAfterBirth(child.dateOfBirth, data.measurementDate);
  const changedFields = [
    record.measurementDate.toISOString().slice(0, 10) !== data.measurementDate
      ? "measurementDate"
      : null,
    record.weightKg.toString() !== String(data.weightKg) ? "weightKg" : null,
    record.heightCm.toString() !== String(data.heightCm) ? "heightCm" : null,
    (record.notes ?? "") !== (data.notes ?? "") ? "notes" : null,
  ].filter((value): value is string => Boolean(value));

  return getPrisma().$transaction(async (transaction) => {
    const corrected = await transaction.growthRecord.update({
      where: { id: record.id },
      data: {
        measurementDate: new Date(`${data.measurementDate}T00:00:00.000Z`),
        weightKg: data.weightKg,
        heightCm: data.heightCm,
        notes: data.notes,
      },
      select: growthRecordSelect,
    });
    await transaction.auditLog.create({
      data: {
        userId: user.id,
        action: "GROWTH_RECORD_CORRECTED",
        entityType: "GrowthRecord",
        entityId: record.id,
        metadata: { reason: data.correctionReason, changedFields },
      },
    });
    return corrected;
  });
}
