import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { ApplicationError } from "@/lib/errors/application-error";
import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import {
  childAccessResource,
  getChild,
} from "@/modules/children/services/child-service";
import { createVaccinationInputSchema } from "@/modules/vaccination/schemas/vaccination-schema";
import { assertVaccinationRegistration } from "@/modules/vaccination/services/vaccination-registration";
import {
  getScheduledDate,
  getVaccinationEvaluationDate,
  getVaccinationStatus,
} from "@/modules/vaccination/services/vaccination-status";

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function listChildVaccinationStatuses(
  user: ApplicationUser,
  childId: string,
  currentInstant = new Date(),
) {
  const child = await getChild(user, childId);
  const resource = childAccessResource(child);
  authorize(user, "vaccination:list", resource);
  const evaluationDate = getVaccinationEvaluationDate(currentInstant);
  const version = await getPrisma().vaccineScheduleVersion.findFirst({
    where: {
      isActive: true,
      effectiveFrom: { lte: new Date(`${evaluationDate}T00:00:00Z`) },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: new Date(`${evaluationDate}T00:00:00Z`) } },
      ],
    },
    orderBy: { effectiveFrom: "desc" },
  });
  if (!version) throw new ApplicationError("VACCINE_SCHEDULE_NOT_FOUND");

  const schedules = await getPrisma().vaccineSchedule.findMany({
    where: { scheduleVersionId: version.id, isActive: true },
    include: {
      vaccine: true,
      vaccinations: {
        where: { childId: child.id },
        select: { id: true, applicationDate: true },
        take: 1,
      },
    },
    orderBy: [
      { recommendedAgeMonths: "asc" },
      { recommendedAgeDays: "asc" },
      { vaccine: { name: "asc" } },
    ],
  });
  const birthDate = dateOnly(child.dateOfBirth);
  return {
    child,
    version,
    evaluationDate,
    doses: schedules.map((schedule) => {
      const vaccination = schedule.vaccinations[0];
      const timing = {
        recommendedAgeMonths: schedule.recommendedAgeMonths,
        recommendedAgeDays: schedule.recommendedAgeDays,
        maximumAgeMonths: schedule.maximumAgeMonths,
        maximumAgeDays: schedule.maximumAgeDays,
        maximumAgeExclusive: schedule.maximumAgeExclusive,
      };
      return {
        id: schedule.id,
        doseCode: schedule.doseCode ?? schedule.id,
        doseName: schedule.doseName ?? `Dosis ${schedule.doseNumber}`,
        vaccineName: schedule.vaccine.name,
        scheduledDate: getScheduledDate(birthDate, timing),
        timingNote: schedule.timingNote,
        status: getVaccinationStatus(
          birthDate,
          evaluationDate,
          timing,
          vaccination ? dateOnly(vaccination.applicationDate) : null,
        ),
        vaccinationId: vaccination?.id ?? null,
        applicationDate: vaccination
          ? dateOnly(vaccination.applicationDate)
          : null,
      };
    }),
  };
}

export async function createVaccination(
  user: ApplicationUser,
  input: unknown,
  currentInstant = new Date(),
) {
  const data = createVaccinationInputSchema(currentInstant).parse(input);
  const child = await getChild(user, data.childId);
  const resource = childAccessResource(child);
  const schedule = await getPrisma().vaccineSchedule.findUnique({
    where: { id: data.vaccineScheduleId },
    include: { version: true },
  });
  if (!schedule) throw new ApplicationError("VACCINE_SCHEDULE_NOT_FOUND");
  const duplicate = await getPrisma().vaccination.findUnique({
    where: {
      childId_vaccineScheduleId: {
        childId: child.id,
        vaccineScheduleId: schedule.id,
      },
    },
  });
  assertVaccinationRegistration({
    user,
    child: {
      isActive: child.isActive,
      dateOfBirth: dateOnly(child.dateOfBirth),
      healthCenterId: child.community.healthCenterId,
      guardianUserIds: resource.guardianUserIds,
    },
    schedule: {
      isActive: schedule.isActive,
      hasApprovedVersion: Boolean(schedule.version),
    },
    applicationDate: data.applicationDate,
    duplicate: Boolean(duplicate),
  });

  try {
    return await getPrisma().$transaction(async (transaction) => {
      const vaccination = await transaction.vaccination.create({
        data: {
          childId: child.id,
          vaccineScheduleId: schedule.id,
          administeredByUserId: user.id,
          applicationDate: new Date(`${data.applicationDate}T00:00:00Z`),
          notes: data.notes,
        },
      });
      await transaction.auditLog.create({
        data: {
          userId: user.id,
          action: "VACCINATION_CREATED",
          entityType: "Vaccination",
          entityId: vaccination.id,
          metadata: {
            childId: child.id,
            vaccineScheduleId: schedule.id,
          },
        },
      });
      return vaccination;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ApplicationError("VACCINATION_DUPLICATE");
    }
    throw error;
  }
}
