import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { verifyPersistedStagingDatabaseIdentity } from "../src/lib/staging/staging-database-identity";
import {
  buildStagingDemoPlan,
  requireStagingDemoConfirmation,
  stagingDemoEvaluationDate,
  stagingDemoMarker,
  type StagingDemoChildScenario,
} from "../src/lib/staging/staging-demo-dataset";
import { validateStagingEnvironment } from "../src/lib/staging/staging-environment";
import { evaluateWeightForAgeAlert } from "../src/modules/growth/services/growth-alert-rule";
import {
  calculateLmsZScore,
  zScoreToPercentile,
} from "../src/modules/growth/services/growth-assessment-engine";
import { calculateExactAge } from "../src/modules/growth/utils/exact-age";
import {
  WHO_STANDARD_NAME,
  WHO_STANDARD_VERSION,
} from "../src/modules/growth/who/who-standard";
import {
  evaluateVaccinationScheduleForChild,
  type VaccinationScheduleEvaluationDose,
} from "../src/modules/vaccination/services/vaccination-status";

config({ path: ".env.staging.local", quiet: true });

const action = process.argv[2] ?? "verify";
if (!new Set(["verify", "apply"]).has(action)) {
  throw new Error("Use verify or apply.");
}

const environment = validateStagingEnvironment(process.env);
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: environment.DIRECT_URL }),
});
const plan = buildStagingDemoPlan();
const evaluationInstant = new Date("2026-09-01T12:00:00-06:00");

function fixtureUuid(sequence: number) {
  return `89000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
}

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

async function resolveBootstrap(
  transaction: Pick<Prisma.TransactionClient, "user">,
) {
  const authUserId = process.env.STAGING_BOOTSTRAP_AUTH_USER_ID;
  if (!authUserId) {
    throw new Error("STAGING DEMO BLOCKED: bootstrap identity is missing.");
  }
  const user = await transaction.user.findUnique({
    where: { authUserId },
    include: { healthCenter: true },
  });
  if (
    !user?.isActive ||
    user.role !== "HEALTH_STAFF" ||
    user.healthCenter?.code !== "SCCVI-STAGING" ||
    !user.healthCenter.isActive
  ) {
    throw new Error(
      "STAGING DEMO BLOCKED: the controlled bootstrap profile is unavailable.",
    );
  }
  return { user, healthCenter: user.healthCenter };
}

function date(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function scheduleInput(schedule: {
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
}): VaccinationScheduleEvaluationDose {
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

function measurementDates(index: number) {
  return [0, 1, 2, 5, 6, 11, 12, 15, 16, 17].includes(index)
    ? ["2026-05-01", "2026-07-01", stagingDemoEvaluationDate]
    : [stagingDemoEvaluationDate];
}

function weightMultiplier(scenario: StagingDemoChildScenario) {
  if (scenario === "low") return 0.7;
  if (scenario === "high") return 1.4;
  return 1;
}

async function assertOwnedIds(
  transaction: Prisma.TransactionClient,
  healthCenterId: string,
) {
  const [communities, children, guardians] = await Promise.all([
    transaction.community.findMany({
      where: { id: { in: plan.communities.map(({ id }) => id) } },
    }),
    transaction.child.findMany({
      where: { id: { in: plan.children.map(({ id }) => id) } },
    }),
    transaction.guardian.findMany({
      where: { id: { in: plan.children.map(({ guardian }) => guardian.id) } },
    }),
  ]);
  if (
    communities.some(
      ({ id, name }) =>
        name !== plan.communities.find((item) => item.id === id)?.name ||
        communities.find((item) => item.id === id)?.healthCenterId !==
          healthCenterId,
    ) ||
    children.some((child) => {
      const expected = plan.children.find(({ id }) => id === child.id);
      return (
        !expected ||
        child.fullName !== expected.fullName ||
        child.communityId !== expected.communityId ||
        child.sex !== expected.sex ||
        child.dateOfBirth.toISOString().slice(0, 10) !== expected.dateOfBirth
      );
    }) ||
    guardians.some((guardian) => {
      const expected = plan.children.find(
        ({ guardian: item }) => item.id === guardian.id,
      );
      return (
        !expected ||
        guardian.fullName !== expected.guardian.fullName ||
        guardian.communityId !== expected.communityId
      );
    })
  ) {
    throw new Error(
      "STAGING DEMO BLOCKED: deterministic ID collision detected.",
    );
  }
}

async function assertFixtureRow(condition: boolean, entity: string) {
  if (!condition) {
    throw new Error(`STAGING DEMO BLOCKED: ${entity} ID collision detected.`);
  }
}

async function assertAlertOwnership(
  transaction: Prisma.TransactionClient,
  id: string,
  childId: string,
) {
  const existing = await transaction.alert.findUnique({ where: { id } });
  await assertFixtureRow(!existing || existing.childId === childId, "alert");
}

async function upsertGrowthRecord(
  transaction: Prisma.TransactionClient,
  input: {
    childIndex: number;
    measurementIndex: number;
    childId: string;
    dateOfBirth: string;
    sex: "MALE" | "FEMALE";
    scenario: StagingDemoChildScenario;
    measurementDate: string;
    userId: string;
  },
) {
  const ageDays = calculateExactAge(
    input.dateOfBirth,
    input.measurementDate,
  ).totalDays;
  const references = await transaction.growthReference.findMany({
    where: {
      standardName: WHO_STANDARD_NAME,
      standardVersion: WHO_STANDARD_VERSION,
      sex: input.sex,
      ageReference: ageDays,
      indicator: { in: ["WEIGHT_FOR_AGE", "HEIGHT_FOR_AGE"] },
    },
  });
  const weightReference = references.find(
    ({ indicator }) => indicator === "WEIGHT_FOR_AGE",
  );
  const heightReference = references.find(
    ({ indicator }) => indicator === "HEIGHT_FOR_AGE",
  );
  if (
    !weightReference ||
    !heightReference ||
    weightReference.parameterL === null ||
    weightReference.parameterM === null ||
    weightReference.parameterS === null ||
    heightReference.parameterL === null ||
    heightReference.parameterM === null ||
    heightReference.parameterS === null
  ) {
    throw new Error("STAGING DEMO BLOCKED: required WHO LMS data is missing.");
  }
  const recordId = fixtureUuid(
    1000 + input.childIndex * 10 + input.measurementIndex,
  );
  const existingRecord = await transaction.growthRecord.findUnique({
    where: { id: recordId },
  });
  await assertFixtureRow(
    !existingRecord ||
      (existingRecord.childId === input.childId &&
        existingRecord.notes === stagingDemoMarker),
    "growth record",
  );
  const multiplier =
    input.measurementIndex === measurementDates(input.childIndex).length - 1
      ? weightMultiplier(input.scenario)
      : 1;
  const weightKg = Number(
    (Number(weightReference.parameterM) * multiplier).toFixed(3),
  );
  const heightCm = Number(Number(heightReference.parameterM).toFixed(2));
  await transaction.growthRecord.upsert({
    where: { id: recordId },
    update: {
      weightKg,
      heightCm,
      measurementDate: date(input.measurementDate),
      notes: stagingDemoMarker,
    },
    create: {
      id: recordId,
      childId: input.childId,
      measuredByUserId: input.userId,
      measurementDate: date(input.measurementDate),
      weightKg,
      heightCm,
      measurementMethod: "RECUMBENT_LENGTH",
      notes: stagingDemoMarker,
    },
  });
  const assessmentResults: Array<{
    id: string;
    indicator: "WEIGHT_FOR_AGE" | "HEIGHT_FOR_AGE";
    percentile: number;
  }> = [];
  for (const [assessmentIndex, item] of [
    {
      indicator: "WEIGHT_FOR_AGE" as const,
      value: weightKg,
      reference: weightReference,
    },
    {
      indicator: "HEIGHT_FOR_AGE" as const,
      value: heightCm,
      reference: heightReference,
    },
  ].entries()) {
    const zScore = calculateLmsZScore(item.value, {
      indicator: item.indicator,
      l: Number(item.reference.parameterL),
      m: Number(item.reference.parameterM),
      s: Number(item.reference.parameterS),
    });
    const percentile = zScoreToPercentile(zScore);
    const assessmentId = fixtureUuid(
      2000 +
        input.childIndex * 20 +
        input.measurementIndex * 2 +
        assessmentIndex,
    );
    const existingAssessment = await transaction.growthAssessment.findUnique({
      where: { id: assessmentId },
    });
    await assertFixtureRow(
      !existingAssessment || existingAssessment.growthRecordId === recordId,
      "growth assessment",
    );
    await transaction.growthAssessment.upsert({
      where: { id: assessmentId },
      update: { zScore, percentile, calculatedAt: evaluationInstant },
      create: {
        id: assessmentId,
        growthRecordId: recordId,
        indicator: item.indicator,
        zScore,
        percentile,
        standardName: WHO_STANDARD_NAME,
        standardVersion: WHO_STANDARD_VERSION,
        calculatedAt: evaluationInstant,
      },
    });
    assessmentResults.push({
      id: assessmentId,
      indicator: item.indicator,
      percentile,
    });
  }
  return { recordId, assessments: assessmentResults };
}

async function applyDataset() {
  requireStagingDemoConfirmation(process.env);
  await verifyIdentity(prisma);
  await prisma.$transaction(
    async (transaction) => {
      await verifyIdentity(transaction);
      const { user, healthCenter } = await resolveBootstrap(transaction);
      await assertOwnedIds(transaction, healthCenter.id);
      for (const community of plan.communities) {
        await transaction.community.upsert({
          where: { id: community.id },
          update: {
            location: community.location,
            estimatedFamilies: community.estimatedFamilies,
            isActive: true,
          },
          create: { ...community, healthCenterId: healthCenter.id },
        });
      }
      for (const child of plan.children) {
        await transaction.guardian.upsert({
          where: { id: child.guardian.id },
          update: { communityId: child.communityId, isActive: true },
          create: {
            id: child.guardian.id,
            communityId: child.communityId,
            fullName: child.guardian.fullName,
          },
        });
        await transaction.child.upsert({
          where: { id: child.id },
          update: { communityId: child.communityId, isActive: true },
          create: {
            id: child.id,
            communityId: child.communityId,
            fullName: child.fullName,
            dateOfBirth: date(child.dateOfBirth),
            sex: child.sex,
          },
        });
        const existingRelation = await transaction.childGuardian.findUnique({
          where: { id: child.relationId },
        });
        await assertFixtureRow(
          !existingRelation ||
            (existingRelation.childId === child.id &&
              existingRelation.guardianId === child.guardian.id),
          "child-guardian association",
        );
        await transaction.childGuardian.upsert({
          where: { id: child.relationId },
          update: { isPrimary: true },
          create: {
            id: child.relationId,
            childId: child.id,
            guardianId: child.guardian.id,
            relationshipType: "Tutor ficticio",
            isPrimary: true,
          },
        });
      }

      const version = await transaction.vaccineScheduleVersion.findUnique({
        where: { code: "GT-MSPAS-2026-01-12" },
      });
      if (!version?.isActive) {
        throw new Error("STAGING DEMO BLOCKED: approved schedule is missing.");
      }
      const schedules = await transaction.vaccineSchedule.findMany({
        where: { scheduleVersionId: version.id, isActive: true },
        include: { vaccine: true },
        orderBy: { doseCode: "asc" },
      });
      if (schedules.length !== 21) {
        throw new Error("STAGING DEMO BLOCKED: expected 21 approved doses.");
      }

      for (const [childIndex, child] of plan.children.entries()) {
        let latestWeightAssessment:
          { id: string; indicator: string; percentile: number } | undefined;
        const recordIds: string[] = [];
        const dates = measurementDates(childIndex);
        for (const [measurementIndex, measurementDate] of dates.entries()) {
          if (measurementDate < child.dateOfBirth) continue;
          const result = await upsertGrowthRecord(transaction, {
            childIndex,
            measurementIndex,
            childId: child.id,
            dateOfBirth: child.dateOfBirth,
            sex: child.sex,
            scenario: child.scenario,
            measurementDate,
            userId: user.id,
          });
          recordIds.push(result.recordId);
          latestWeightAssessment = result.assessments.find(
            ({ indicator }) => indicator === "WEIGHT_FOR_AGE",
          );
        }
        const growthRule = evaluateWeightForAgeAlert(
          "WEIGHT_FOR_AGE",
          latestWeightAssessment?.percentile ?? null,
        );
        if (growthRule && latestWeightAssessment) {
          await assertAlertOwnership(
            transaction,
            fixtureUuid(7000 + childIndex * 10),
            child.id,
          );
          await transaction.alert.upsert({
            where: { id: fixtureUuid(7000 + childIndex * 10) },
            update: { title: growthRule.title, message: growthRule.message },
            create: {
              id: fixtureUuid(7000 + childIndex * 10),
              childId: child.id,
              type: "GROWTH",
              severity: "PREVENTIVE",
              title: growthRule.title,
              message: growthRule.message,
              sourceType: "GROWTH_ASSESSMENT_WEIGHT_PERCENTILE",
              sourceId: latestWeightAssessment.id,
            },
          });
        }
        if (child.scenario === "follow-up") {
          const followUpId = fixtureUuid(6000 + childIndex);
          const sourceRecordId = recordIds.at(-2);
          if (!sourceRecordId) {
            throw new Error(
              "STAGING DEMO BLOCKED: follow-up requires historical growth data.",
            );
          }
          const existingFollowUp = await transaction.growthFollowUp.findUnique({
            where: { id: followUpId },
          });
          await assertFixtureRow(
            !existingFollowUp ||
              (existingFollowUp.childId === child.id &&
                existingFollowUp.sourceGrowthRecordId === sourceRecordId),
            "growth follow-up",
          );
          await transaction.growthFollowUp.upsert({
            where: { id: followUpId },
            update: { dueDate: date("2026-08-01") },
            create: {
              id: followUpId,
              childId: child.id,
              scheduledByUserId: user.id,
              sourceGrowthRecordId: sourceRecordId,
              dueDate: date("2026-08-01"),
            },
          });
          await assertAlertOwnership(
            transaction,
            fixtureUuid(7001 + childIndex * 10),
            child.id,
          );
          await transaction.alert.upsert({
            where: { id: fixtureUuid(7001 + childIndex * 10) },
            update: {},
            create: {
              id: fixtureUuid(7001 + childIndex * 10),
              childId: child.id,
              type: "MISSED_FOLLOW_UP",
              severity: "PREVENTIVE",
              title: "Seguimiento de crecimiento pendiente",
              message:
                "El seguimiento ficticio vencido requiere coordinación. No constituye un diagnóstico médico.",
              sourceType: "GrowthFollowUp",
              sourceId: followUpId,
            },
          });
        }

        const emptyStatus = evaluateVaccinationScheduleForChild({
          dateOfBirth: child.dateOfBirth,
          evaluationDate: stagingDemoEvaluationDate,
          version: {
            code: version.code,
            effectiveFrom: version.effectiveFrom.toISOString().slice(0, 10),
            effectiveTo:
              version.effectiveTo?.toISOString().slice(0, 10) ?? null,
          },
          schedules: schedules.map(scheduleInput),
          vaccinations: [],
        });
        if (child.scenario === "applied") {
          for (const [doseIndex, dose] of emptyStatus.entries()) {
            if (
              !dose.applicable ||
              dose.scheduledDate > stagingDemoEvaluationDate
            )
              continue;
            const vaccinationId = fixtureUuid(
              4000 + childIndex * 100 + doseIndex,
            );
            const existingVaccination =
              await transaction.vaccination.findUnique({
                where: { id: vaccinationId },
              });
            await assertFixtureRow(
              !existingVaccination ||
                (existingVaccination.childId === child.id &&
                  existingVaccination.vaccineScheduleId === dose.id &&
                  existingVaccination.notes === stagingDemoMarker),
              "vaccination",
            );
            await transaction.vaccination.upsert({
              where: { id: vaccinationId },
              update: { applicationDate: date(dose.scheduledDate) },
              create: {
                id: vaccinationId,
                childId: child.id,
                vaccineScheduleId: dose.id,
                administeredByUserId: user.id,
                applicationDate: date(dose.scheduledDate),
                notes: stagingDemoMarker,
              },
            });
          }
        }
        if (child.scenario === "overdue") {
          const overdueDose = emptyStatus.find(
            ({ applicable, status }) => applicable && status === "OVERDUE",
          );
          if (overdueDose) {
            await assertAlertOwnership(
              transaction,
              fixtureUuid(7002 + childIndex * 10),
              child.id,
            );
            await transaction.alert.upsert({
              where: { id: fixtureUuid(7002 + childIndex * 10) },
              update: {},
              create: {
                id: fixtureUuid(7002 + childIndex * 10),
                childId: child.id,
                type: "VACCINATION",
                severity: "PREVENTIVE",
                title: "Dosis de vacunación atrasada",
                message: `${overdueDose.vaccineName} — ${overdueDose.doseName} requiere seguimiento. No constituye una indicación clínica individual.`,
                sourceType: "VaccineSchedule",
                sourceId: `${child.id}:${overdueDose.id}`,
              },
            });
          }
        }
      }
    },
    { maxWait: 10_000, timeout: 180_000 },
  );
}

async function verifyDataset() {
  await verifyIdentity(prisma);
  const { healthCenter } = await resolveBootstrap(prisma);
  const version = await prisma.vaccineScheduleVersion.findUniqueOrThrow({
    where: { code: "GT-MSPAS-2026-01-12" },
  });
  const schedules = await prisma.vaccineSchedule.findMany({
    where: { scheduleVersionId: version.id, isActive: true },
    include: { vaccine: true },
  });
  const children = await prisma.child.findMany({
    where: { id: { in: plan.children.map(({ id }) => id) } },
    include: { growthRecords: true, vaccinations: true, alerts: true },
  });
  const communities = await prisma.community.count({
    where: {
      id: { in: plan.communities.map(({ id }) => id) },
      healthCenterId: healthCenter.id,
    },
  });
  const guardians = await prisma.guardian.count({
    where: { id: { in: plan.children.map(({ guardian }) => guardian.id) } },
  });
  const histories = children.filter(
    ({ growthRecords }) => growthRecords.length >= 3,
  ).length;
  const applied = children.filter(
    (child) =>
      plan.children.find(({ id }) => id === child.id)?.scenario === "applied" &&
      child.vaccinations.length > 0,
  ).length;
  const statusByChild = new Map(
    children.map((child) => [
      child.id,
      evaluateVaccinationScheduleForChild({
        dateOfBirth: child.dateOfBirth.toISOString().slice(0, 10),
        evaluationDate: stagingDemoEvaluationDate,
        version: {
          code: version.code,
          effectiveFrom: version.effectiveFrom.toISOString().slice(0, 10),
          effectiveTo: version.effectiveTo?.toISOString().slice(0, 10) ?? null,
        },
        schedules: schedules.map(scheduleInput),
        vaccinations: child.vaccinations.map((vaccination) => ({
          id: vaccination.id,
          vaccineScheduleId: vaccination.vaccineScheduleId,
          applicationDate: vaccination.applicationDate
            .toISOString()
            .slice(0, 10),
        })),
      }),
    ]),
  );
  const pending = plan.children.filter(
    (child) =>
      child.scenario === "pending" &&
      statusByChild
        .get(child.id)
        ?.some(({ applicable, status }) => applicable && status === "PENDING"),
  ).length;
  const overdueStatuses = plan.children.filter(
    (child) =>
      child.scenario === "overdue" &&
      statusByChild
        .get(child.id)
        ?.some(({ applicable, status }) => applicable && status === "OVERDUE"),
  ).length;
  const currentlyComplete = plan.children.filter(
    (child) =>
      child.scenario === "applied" &&
      !statusByChild
        .get(child.id)
        ?.some(
          ({ applicable, scheduledDate, status }) =>
            applicable &&
            scheduledDate <= stagingDemoEvaluationDate &&
            status !== "APPLIED",
        ),
  ).length;
  const overdue = children.filter(({ alerts }) =>
    alerts.some(({ type }) => type === "VACCINATION"),
  ).length;
  const followUps = children.filter(({ alerts }) =>
    alerts.some(({ type }) => type === "MISSED_FOLLOW_UP"),
  ).length;
  const result = {
    communities,
    children: children.length,
    guardians,
    childrenWithGrowthHistory: histories,
    childrenWithAppliedVaccines: applied,
    childrenWithPendingDoses: pending,
    childrenWithOverdueDoses: overdueStatuses,
    childrenCompleteForDueDoses: currentlyComplete,
    childrenWithVaccinationAlerts: overdue,
    childrenWithMissedFollowUpAlerts: followUps,
  };
  if (
    communities !== 5 ||
    children.length !== 18 ||
    guardians !== 18 ||
    histories < 6 ||
    applied < 3 ||
    pending < 3 ||
    overdueStatuses < 3 ||
    currentlyComplete < 3 ||
    overdue < 3 ||
    followUps < 2
  ) {
    throw new Error("STAGING DEMO VERIFY FAILED: dataset is incomplete.");
  }
  console.table(result);
  console.info(`Staging demo verified: ${stagingDemoMarker}.`);
}

async function main() {
  await verifyIdentity(prisma);
  if (action === "apply") await applyDataset();
  await verifyDataset();
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Staging demo dataset failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
