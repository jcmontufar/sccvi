import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { ApplicationError } from "@/lib/errors/application-error";
import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import {
  childAccessResource,
  getChild,
} from "@/modules/children/services/child-service";
import { createVaccinationInputSchema } from "@/modules/vaccination/schemas/vaccination-schema";
import { assertVaccinationRegistration } from "@/modules/vaccination/services/vaccination-registration";
import {
  evaluateVaccinationScheduleForChild,
  getVaccinationEvaluationDate,
} from "@/modules/vaccination/services/vaccination-status";

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function scheduleEvaluationInput(schedule: {
  id: string;
  doseCode: string | null;
  doseName: string | null;
  doseNumber: number;
  timingNote: string | null;
  recommendedAgeMonths: number | null;
  recommendedAgeDays: number | null;
  minimumAgeMonths: number | null;
  minimumAgeDays: number | null;
  maximumAgeMonths: number | null;
  maximumAgeDays: number | null;
  maximumAgeExclusive: boolean;
  vaccine: { name: string; officialCode: string | null };
}) {
  return {
    id: schedule.id,
    doseCode: schedule.doseCode,
    doseName: schedule.doseName,
    doseNumber: schedule.doseNumber,
    timingNote: schedule.timingNote,
    recommendedAgeMonths: schedule.recommendedAgeMonths,
    recommendedAgeDays: schedule.recommendedAgeDays,
    minimumAgeMonths: schedule.minimumAgeMonths,
    minimumAgeDays: schedule.minimumAgeDays,
    maximumAgeMonths: schedule.maximumAgeMonths,
    maximumAgeDays: schedule.maximumAgeDays,
    maximumAgeExclusive: schedule.maximumAgeExclusive,
    vaccineName: schedule.vaccine.name,
    vaccineOfficialCode: schedule.vaccine.officialCode,
  };
}

function versionApplicability(version: {
  code: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}) {
  return {
    code: version.code,
    effectiveFrom: dateOnly(version.effectiveFrom),
    effectiveTo: version.effectiveTo ? dateOnly(version.effectiveTo) : null,
  };
}

async function getApplicableVersion(evaluationDate: string) {
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
  return version;
}

export async function listActiveVaccinationScheduleDoses(
  user: ApplicationUser,
  currentInstant = new Date(),
) {
  authorize(user, "vaccination:list");
  const evaluationDate = getVaccinationEvaluationDate(currentInstant);
  const version = await getApplicableVersion(evaluationDate);
  const schedules = await getPrisma().vaccineSchedule.findMany({
    where: {
      scheduleVersionId: version.id,
      isActive: true,
      doseCode: { not: null },
    },
    select: {
      doseCode: true,
      doseName: true,
      doseNumber: true,
      vaccine: { select: { name: true } },
    },
    orderBy: [
      { recommendedAgeMonths: "asc" },
      { recommendedAgeDays: "asc" },
      { vaccine: { name: "asc" } },
    ],
  });
  return {
    versionCode: version.code,
    doses: schedules.flatMap((schedule) =>
      schedule.doseCode
        ? [
            {
              doseCode: schedule.doseCode,
              label: `${schedule.vaccine.name} — ${schedule.doseName ?? `Dosis ${schedule.doseNumber}`}`,
            },
          ]
        : [],
    ),
  };
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
  const version = await getApplicableVersion(evaluationDate);

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
  return {
    child,
    version,
    evaluationDate,
    doses: evaluateVaccinationScheduleForChild({
      dateOfBirth: dateOnly(child.dateOfBirth),
      evaluationDate,
      version: versionApplicability(version),
      schedules: schedules.map(scheduleEvaluationInput),
      vaccinations: schedules.flatMap((schedule) =>
        schedule.vaccinations.map((vaccination) => ({
          id: vaccination.id,
          vaccineScheduleId: schedule.id,
          applicationDate: dateOnly(vaccination.applicationDate),
        })),
      ),
    }),
  };
}

export async function listAuthorizedChildrenVaccinationStatuses(
  user: ApplicationUser,
  currentInstant = new Date(),
  limit = 1000,
) {
  authorize(user, "vaccination:list", {
    guardianUserIds: user.role === "GUARDIAN" ? [user.id] : undefined,
  });
  const evaluationDate = getVaccinationEvaluationDate(currentInstant);
  const version = await getApplicableVersion(evaluationDate);
  const schedules = await getPrisma().vaccineSchedule.findMany({
    where: { scheduleVersionId: version.id, isActive: true },
    include: { vaccine: true },
    orderBy: [
      { recommendedAgeMonths: "asc" },
      { recommendedAgeDays: "asc" },
      { vaccine: { name: "asc" } },
    ],
  });
  const children = await getPrisma().child.findMany({
    where: {
      isActive: true,
      community: {
        healthCenterId:
          user.role === "ADMIN" || user.role === "GUARDIAN"
            ? undefined
            : (user.healthCenterId ?? ""),
      },
      childGuardians:
        user.role === "GUARDIAN"
          ? { some: { guardian: { userId: user.id, isActive: true } } }
          : undefined,
    },
    select: {
      id: true,
      fullName: true,
      dateOfBirth: true,
      community: {
        select: {
          name: true,
          healthCenter: { select: { name: true } },
        },
      },
    },
    take: limit,
  });
  const vaccinations = children.length
    ? await getPrisma().vaccination.findMany({
        where: {
          childId: { in: children.map(({ id }) => id) },
          vaccineSchedule: { scheduleVersionId: version.id },
        },
        select: {
          id: true,
          childId: true,
          vaccineScheduleId: true,
          applicationDate: true,
        },
      })
    : [];
  const scheduleInputs = schedules.map(scheduleEvaluationInput);
  const applicableVersion = versionApplicability(version);
  const vaccinationsByChild = new Map<
    string,
    { id: string; vaccineScheduleId: string; applicationDate: string }[]
  >();
  for (const vaccination of vaccinations) {
    const existing = vaccinationsByChild.get(vaccination.childId) ?? [];
    existing.push({
      id: vaccination.id,
      vaccineScheduleId: vaccination.vaccineScheduleId,
      applicationDate: dateOnly(vaccination.applicationDate),
    });
    vaccinationsByChild.set(vaccination.childId, existing);
  }
  return children.map((child) => ({
    child,
    version,
    evaluationDate,
    doses: evaluateVaccinationScheduleForChild({
      dateOfBirth: dateOnly(child.dateOfBirth),
      evaluationDate,
      version: applicableVersion,
      schedules: scheduleInputs,
      vaccinations: vaccinationsByChild.get(child.id) ?? [],
    }),
  }));
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
      await recordAuditEvent(transaction, {
        userId: user.id,
        action: "VACCINATION_CREATED",
        entityType: "Vaccination",
        entityId: vaccination.id,
        metadata: {
          childId: child.id,
          vaccineScheduleId: schedule.id,
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
