import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import {
  validateDemoDatabaseEnvironment,
  verifyDemoDatabaseIdentity,
  type DemoDatabaseConfiguration,
} from "../src/lib/demo/demo-database-identity";
import { getCurrentBusinessDate } from "../src/lib/date/business-date";
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
import { calculateDoseCoverage } from "../src/modules/reports/services/report-rules";

config({ path: ".env.local", quiet: true });
config({ path: ".env.test.local", quiet: true });

const action = process.argv[2];
if (!new Set(["load", "verify", "clean"]).has(action ?? "")) {
  throw new Error("Use load, verify or clean.");
}

const configuration = validateDemoDatabaseEnvironment(process.env);
const adapter = new PrismaPg({ connectionString: configuration.databaseUrl });
const prisma = new PrismaClient({ adapter });
const marker = "SCCVI_FUNCTIONAL_DEMO_V1";
const evaluationInstant = new Date("2026-08-28T12:00:00-06:00");
const evaluationDate = getCurrentBusinessDate({
  currentInstant: evaluationInstant,
});

const ids = {
  user: "10000000-0000-4000-8000-000000000001",
  communities: [
    "10000000-0000-4000-8000-000000000011",
    "10000000-0000-4000-8000-000000000012",
  ],
  guardians: [
    "10000000-0000-4000-8000-000000000021",
    "10000000-0000-4000-8000-000000000022",
  ],
  children: {
    normal: "10000000-0000-4000-8000-000000000101",
    low: "10000000-0000-4000-8000-000000000102",
    high: "10000000-0000-4000-8000-000000000103",
    overdue: "10000000-0000-4000-8000-000000000104",
    coverageZero: "10000000-0000-4000-8000-000000000105",
    applied: "10000000-0000-4000-8000-000000000106",
    followUp: "10000000-0000-4000-8000-000000000107",
  },
  relations: Array.from(
    { length: 7 },
    (_, index) =>
      `10000000-0000-4000-8000-${String(201 + index).padStart(12, "0")}`,
  ),
  growthRecords: {
    normal: "10000000-0000-4000-8000-000000000301",
    low: "10000000-0000-4000-8000-000000000302",
    high: "10000000-0000-4000-8000-000000000303",
    followUp: "10000000-0000-4000-8000-000000000304",
  },
  assessments: Array.from(
    { length: 8 },
    (_, index) =>
      `10000000-0000-4000-8000-${String(401 + index).padStart(12, "0")}`,
  ),
  followUp: "10000000-0000-4000-8000-000000000501",
  vaccinations: [
    "10000000-0000-4000-8000-000000000601",
    "10000000-0000-4000-8000-000000000602",
  ],
  alerts: {
    low: "10000000-0000-4000-8000-000000000701",
    high: "10000000-0000-4000-8000-000000000702",
    overdue: "10000000-0000-4000-8000-000000000703",
    followUp: "10000000-0000-4000-8000-000000000704",
  },
} as const;

const childDefinitions = [
  {
    key: "normal",
    id: ids.children.normal,
    name: "[DEMO FUNCIONAL] Ana Crecimiento Normal",
    dateOfBirth: "2026-01-15",
    community: 0,
  },
  {
    key: "low",
    id: ids.children.low,
    name: "[DEMO FUNCIONAL] Bruno Peso Bajo",
    dateOfBirth: "2026-01-15",
    community: 0,
  },
  {
    key: "high",
    id: ids.children.high,
    name: "[DEMO FUNCIONAL] Camila Peso Alto",
    dateOfBirth: "2026-01-15",
    community: 1,
  },
  {
    key: "overdue",
    id: ids.children.overdue,
    name: "[DEMO FUNCIONAL] Diego Hexavalente Atrasada",
    dateOfBirth: "2026-02-01",
    community: 0,
  },
  {
    key: "coverageZero",
    id: ids.children.coverageZero,
    name: "[DEMO FUNCIONAL] Elena Varicela Pendiente",
    dateOfBirth: "2025-01-12",
    community: 0,
  },
  {
    key: "applied",
    id: ids.children.applied,
    name: "[DEMO FUNCIONAL] Fabio Vacunas Aplicadas",
    dateOfBirth: "2025-01-12",
    community: 1,
  },
  {
    key: "followUp",
    id: ids.children.followUp,
    name: "[DEMO FUNCIONAL] Gabriela Seguimiento Vencido",
    dateOfBirth: "2026-01-15",
    community: 1,
  },
] as const;

const allChildIds: string[] = childDefinitions.map(({ id }) => id);
const allGrowthRecordIds: string[] = Object.values(ids.growthRecords);
const allAlertIds: string[] = Object.values(ids.alerts);

async function verifyIdentityWithPool() {
  const pool = new Pool({ connectionString: configuration.databaseUrl });
  const client = await pool.connect();
  try {
    await verifyDemoDatabaseIdentity(client, configuration);
  } finally {
    client.release();
    await pool.end();
  }
}

async function verifyIdentityInTransaction(
  transaction: Prisma.TransactionClient,
  expected: DemoDatabaseConfiguration,
) {
  await verifyDemoDatabaseIdentity(
    {
      query: async <Row>(sql: string) => ({
        rows: await transaction.$queryRawUnsafe<Row[]>(sql),
      }),
    },
    expected,
  );
}

async function resolveHealthCenter() {
  const explicitId = process.env.SCCVI_DEMO_HEALTH_CENTER_ID;
  const center = explicitId
    ? await prisma.healthCenter.findFirst({
        where: { id: explicitId, isActive: true },
      })
    : configuration.target === "ISOLATED_TEST" &&
        process.env.E2E_EXISTING_CHILD_ID
      ? (
          await prisma.child.findUnique({
            where: { id: process.env.E2E_EXISTING_CHILD_ID },
            include: { community: { include: { healthCenter: true } } },
          })
        )?.community.healthCenter
      : await prisma.healthCenter.findFirst({
          where: { code: "SCCVI-DEMO", isActive: true },
        });
  if (!center) {
    throw new Error(
      "DEMO FIXTURES BLOCKED: no active authorized health center was resolved.",
    );
  }
  return center;
}

async function assertFixtureOwnership(transaction: Prisma.TransactionClient) {
  const user = await transaction.user.findUnique({ where: { id: ids.user } });
  if (
    user &&
    (user.authUserId !== "10000000-0000-4000-8000-000000000002" ||
      user.email !== "functional-demo-user@example.invalid" ||
      user.fullName !== "[DEMO FUNCIONAL] Usuario registrador")
  ) {
    throw new Error("DEMO FIXTURES BLOCKED: fixture user ID collision.");
  }
  const communities = await transaction.community.findMany({
    where: { id: { in: [...ids.communities] } },
  });
  const expectedCommunityNames = new Map<string, string>([
    [ids.communities[0], "[DEMO FUNCIONAL] El Pinar"],
    [ids.communities[1], "[DEMO FUNCIONAL] Los Cipreses"],
  ]);
  if (
    communities.some(
      (community) =>
        community.name !== expectedCommunityNames.get(community.id),
    )
  ) {
    throw new Error("DEMO FIXTURES BLOCKED: fixture community ID collision.");
  }
  const children = await transaction.child.findMany({
    where: { id: { in: allChildIds } },
  });
  const expectedChildNames = new Map<string, string>(
    childDefinitions.map(({ id, name }) => [id, name]),
  );
  if (
    children.some(
      (child) => child.fullName !== expectedChildNames.get(child.id),
    )
  ) {
    throw new Error("DEMO FIXTURES BLOCKED: fixture child ID collision.");
  }
  const guardians = await transaction.guardian.findMany({
    where: { id: { in: [...ids.guardians] } },
  });
  const expectedGuardianNames = new Map<string, string>([
    [ids.guardians[0], "[DEMO FUNCIONAL] Tutora El Pinar"],
    [ids.guardians[1], "[DEMO FUNCIONAL] Tutor Los Cipreses"],
  ]);
  if (
    guardians.some(
      (guardian) =>
        guardian.fullName !== expectedGuardianNames.get(guardian.id),
    )
  ) {
    throw new Error("DEMO FIXTURES BLOCKED: fixture guardian ID collision.");
  }
  const relations = await transaction.childGuardian.findMany({
    where: { id: { in: ids.relations } },
  });
  if (
    relations.some((relation) => {
      const expectedChild = childDefinitions.find(
        (_, childIndex) => ids.relations[childIndex] === relation.id,
      );
      return (
        !expectedChild ||
        relation.childId !== expectedChild.id ||
        relation.guardianId !== ids.guardians[expectedChild.community]
      );
    })
  ) {
    throw new Error(
      "DEMO FIXTURES BLOCKED: fixture guardian association ID collision.",
    );
  }
  const records = await transaction.growthRecord.findMany({
    where: { id: { in: allGrowthRecordIds } },
  });
  if (records.some((record) => record.notes !== marker)) {
    throw new Error("DEMO FIXTURES BLOCKED: fixture growth ID collision.");
  }
  const assessments = await transaction.growthAssessment.findMany({
    where: { id: { in: [...ids.assessments] } },
  });
  if (
    assessments.some(
      (assessment) => !allGrowthRecordIds.includes(assessment.growthRecordId),
    )
  ) {
    throw new Error("DEMO FIXTURES BLOCKED: fixture assessment ID collision.");
  }
  const followUp = await transaction.growthFollowUp.findUnique({
    where: { id: ids.followUp },
  });
  if (
    followUp &&
    (followUp.childId !== ids.children.followUp ||
      followUp.sourceGrowthRecordId !== ids.growthRecords.followUp)
  ) {
    throw new Error("DEMO FIXTURES BLOCKED: fixture follow-up ID collision.");
  }
  const vaccinations = await transaction.vaccination.findMany({
    where: { id: { in: [...ids.vaccinations] } },
  });
  if (vaccinations.some((vaccination) => vaccination.notes !== marker)) {
    throw new Error("DEMO FIXTURES BLOCKED: fixture vaccination ID collision.");
  }
  const alerts = await transaction.alert.findMany({
    where: { id: { in: allAlertIds } },
  });
  if (alerts.some((alert) => !allChildIds.includes(alert.childId))) {
    throw new Error("DEMO FIXTURES BLOCKED: fixture alert ID collision.");
  }
}

async function cleanFixtureRows(transaction: Prisma.TransactionClient) {
  await assertFixtureOwnership(transaction);
  await transaction.alert.deleteMany({ where: { id: { in: allAlertIds } } });
  await transaction.growthFollowUp.deleteMany({ where: { id: ids.followUp } });
  await transaction.growthAssessment.deleteMany({
    where: { id: { in: [...ids.assessments] } },
  });
  await transaction.vaccination.deleteMany({
    where: { id: { in: [...ids.vaccinations] } },
  });
  await transaction.growthRecord.deleteMany({
    where: { id: { in: allGrowthRecordIds } },
  });
  await transaction.childGuardian.deleteMany({
    where: { id: { in: ids.relations } },
  });
  await transaction.child.deleteMany({ where: { id: { in: allChildIds } } });
  await transaction.guardian.deleteMany({
    where: { id: { in: [...ids.guardians] } },
  });
  await transaction.user.deleteMany({ where: { id: ids.user } });
  await transaction.community.deleteMany({
    where: { id: { in: [...ids.communities] } },
  });
}

function rounded(value: number, digits: number) {
  return Number(value.toFixed(digits));
}

async function createGrowthFixture(
  transaction: Prisma.TransactionClient,
  input: {
    childId: string;
    childBirthDate: string;
    recordId: string;
    assessmentOffset: number;
    measurementDate: string;
    weightMultiplier: number;
  },
) {
  const ageDays = calculateExactAge(
    input.childBirthDate,
    input.measurementDate,
  ).totalDays;
  const references = await transaction.growthReference.findMany({
    where: {
      standardName: WHO_STANDARD_NAME,
      standardVersion: WHO_STANDARD_VERSION,
      sex: "MALE",
      ageReference: ageDays,
      indicator: { in: ["WEIGHT_FOR_AGE", "HEIGHT_FOR_AGE"] },
    },
  });
  if (references.length !== 2) {
    throw new Error(
      "DEMO FIXTURES BLOCKED: required WHO references are missing.",
    );
  }
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
    throw new Error(
      "DEMO FIXTURES BLOCKED: WHO LMS parameters are incomplete.",
    );
  }
  const weightKg = rounded(
    Number(weightReference.parameterM) * input.weightMultiplier,
    3,
  );
  const heightCm = rounded(Number(heightReference.parameterM), 2);
  const record = await transaction.growthRecord.create({
    data: {
      id: input.recordId,
      childId: input.childId,
      measuredByUserId: ids.user,
      measurementDate: new Date(`${input.measurementDate}T00:00:00Z`),
      weightKg,
      heightCm,
      measurementMethod: "RECUMBENT_LENGTH",
      notes: marker,
    },
  });
  const assessmentInputs = [
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
  ];
  const assessments: Array<{
    id: string;
    indicator: string;
    percentile: Prisma.Decimal | null;
  }> = [];
  for (const [index, assessment] of assessmentInputs.entries()) {
    const reference = {
      indicator: assessment.indicator,
      l: Number(assessment.reference.parameterL),
      m: Number(assessment.reference.parameterM),
      s: Number(assessment.reference.parameterS),
    };
    const zScore = calculateLmsZScore(assessment.value, reference);
    assessments.push(
      await transaction.growthAssessment.create({
        data: {
          id: ids.assessments[input.assessmentOffset + index],
          growthRecordId: record.id,
          indicator: assessment.indicator,
          zScore,
          percentile: zScoreToPercentile(zScore),
          classification: null,
          standardName: WHO_STANDARD_NAME,
          standardVersion: WHO_STANDARD_VERSION,
          calculatedAt: evaluationInstant,
        },
      }),
    );
  }
  return { record, assessments };
}

async function loadFixtures(centerId: string) {
  await prisma.$transaction(async (transaction) => {
    await verifyIdentityInTransaction(transaction, configuration);
    await cleanFixtureRows(transaction);
    const version = await transaction.vaccineScheduleVersion.findUnique({
      where: { code: "GT-MSPAS-2026-01-12" },
    });
    if (!version?.isActive) {
      throw new Error(
        "DEMO FIXTURES BLOCKED: approved vaccination version is missing.",
      );
    }
    const schedules = await transaction.vaccineSchedule.findMany({
      where: {
        scheduleVersionId: version.id,
        doseCode: { in: ["HEXAVALENT_1", "VARICELLA_1", "MMR_1"] },
        isActive: true,
      },
    });
    if (schedules.length !== 3) {
      throw new Error(
        "DEMO FIXTURES BLOCKED: required approved doses are missing.",
      );
    }

    await transaction.community.createMany({
      data: [
        {
          id: ids.communities[0],
          healthCenterId: centerId,
          name: "[DEMO FUNCIONAL] El Pinar",
        },
        {
          id: ids.communities[1],
          healthCenterId: centerId,
          name: "[DEMO FUNCIONAL] Los Cipreses",
        },
      ],
    });
    await transaction.user.create({
      data: {
        id: ids.user,
        authUserId: "10000000-0000-4000-8000-000000000002",
        healthCenterId: centerId,
        fullName: "[DEMO FUNCIONAL] Usuario registrador",
        email: "functional-demo-user@example.invalid",
        role: "HEALTH_STAFF",
      },
    });
    await transaction.guardian.createMany({
      data: [
        {
          id: ids.guardians[0],
          communityId: ids.communities[0],
          fullName: "[DEMO FUNCIONAL] Tutora El Pinar",
        },
        {
          id: ids.guardians[1],
          communityId: ids.communities[1],
          fullName: "[DEMO FUNCIONAL] Tutor Los Cipreses",
        },
      ],
    });
    await transaction.child.createMany({
      data: childDefinitions.map((child) => ({
        id: child.id,
        communityId: ids.communities[child.community],
        fullName: child.name,
        dateOfBirth: new Date(`${child.dateOfBirth}T00:00:00Z`),
        sex: "MALE" as const,
      })),
    });
    await transaction.childGuardian.createMany({
      data: childDefinitions.map((child, index) => ({
        id: ids.relations[index],
        childId: child.id,
        guardianId: ids.guardians[child.community],
        relationshipType: "Tutor ficticio",
        isPrimary: true,
      })),
    });

    const normal = await createGrowthFixture(transaction, {
      childId: ids.children.normal,
      childBirthDate: "2026-01-15",
      recordId: ids.growthRecords.normal,
      assessmentOffset: 0,
      measurementDate: evaluationDate,
      weightMultiplier: 1,
    });
    const low = await createGrowthFixture(transaction, {
      childId: ids.children.low,
      childBirthDate: "2026-01-15",
      recordId: ids.growthRecords.low,
      assessmentOffset: 2,
      measurementDate: evaluationDate,
      weightMultiplier: 0.7,
    });
    const high = await createGrowthFixture(transaction, {
      childId: ids.children.high,
      childBirthDate: "2026-01-15",
      recordId: ids.growthRecords.high,
      assessmentOffset: 4,
      measurementDate: evaluationDate,
      weightMultiplier: 1.4,
    });
    const followUpGrowth = await createGrowthFixture(transaction, {
      childId: ids.children.followUp,
      childBirthDate: "2026-01-15",
      recordId: ids.growthRecords.followUp,
      assessmentOffset: 6,
      measurementDate: "2026-06-01",
      weightMultiplier: 1,
    });

    for (const [key, fixture, alertId] of [
      ["low", low, ids.alerts.low],
      ["high", high, ids.alerts.high],
    ] as const) {
      const weightAssessment = fixture.assessments.find(
        ({ indicator }) => indicator === "WEIGHT_FOR_AGE",
      );
      const rule = evaluateWeightForAgeAlert(
        "WEIGHT_FOR_AGE",
        weightAssessment?.percentile
          ? Number(weightAssessment.percentile)
          : null,
      );
      if (!weightAssessment || !rule) {
        throw new Error(
          `DEMO FIXTURES BLOCKED: ${key} growth case is invalid.`,
        );
      }
      await transaction.alert.create({
        data: {
          id: alertId,
          childId: key === "low" ? ids.children.low : ids.children.high,
          type: "GROWTH",
          severity: "PREVENTIVE",
          title: rule.title,
          message: rule.message,
          sourceType: "GROWTH_ASSESSMENT_WEIGHT_PERCENTILE",
          sourceId: weightAssessment.id,
        },
      });
    }
    if (
      evaluateWeightForAgeAlert(
        "WEIGHT_FOR_AGE",
        Number(normal.assessments[0]?.percentile),
      )
    ) {
      throw new Error(
        "DEMO FIXTURES BLOCKED: normal growth case is not normal.",
      );
    }

    await transaction.growthFollowUp.create({
      data: {
        id: ids.followUp,
        childId: ids.children.followUp,
        scheduledByUserId: ids.user,
        sourceGrowthRecordId: followUpGrowth.record.id,
        dueDate: new Date("2026-07-01T00:00:00Z"),
      },
    });
    await transaction.alert.create({
      data: {
        id: ids.alerts.followUp,
        childId: ids.children.followUp,
        type: "MISSED_FOLLOW_UP",
        severity: "PREVENTIVE",
        title: "Seguimiento de crecimiento pendiente",
        message:
          "El seguimiento ficticio vencido requiere coordinación con el centro de salud. Esta alerta no constituye un diagnóstico médico.",
        sourceType: "GrowthFollowUp",
        sourceId: ids.followUp,
      },
    });

    const varicella = schedules.find(
      ({ doseCode }) => doseCode === "VARICELLA_1",
    )!;
    const mmr = schedules.find(({ doseCode }) => doseCode === "MMR_1")!;
    await transaction.vaccination.createMany({
      data: [
        {
          id: ids.vaccinations[0],
          childId: ids.children.applied,
          vaccineScheduleId: varicella.id,
          administeredByUserId: ids.user,
          applicationDate: new Date("2026-04-12T00:00:00Z"),
          notes: marker,
        },
        {
          id: ids.vaccinations[1],
          childId: ids.children.applied,
          vaccineScheduleId: mmr.id,
          administeredByUserId: ids.user,
          applicationDate: new Date("2026-01-12T00:00:00Z"),
          notes: marker,
        },
      ],
    });
    const hexavalent = schedules.find(
      ({ doseCode }) => doseCode === "HEXAVALENT_1",
    )!;
    await transaction.alert.create({
      data: {
        id: ids.alerts.overdue,
        childId: ids.children.overdue,
        type: "VACCINATION",
        severity: "PREVENTIVE",
        title: "Dosis de vacunación atrasada",
        message:
          "Hexavalente — Primera dosis requiere seguimiento con el centro de salud. Esta alerta no constituye un diagnóstico ni una indicación clínica individual.",
        sourceType: "VaccineSchedule",
        sourceId: `${ids.children.overdue}:${hexavalent.id}`,
      },
    });
  });
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

async function verifyFixtures(centerId: string) {
  const version = await prisma.vaccineScheduleVersion.findUniqueOrThrow({
    where: { code: "GT-MSPAS-2026-01-12" },
  });
  const schedules = await prisma.vaccineSchedule.findMany({
    where: { scheduleVersionId: version.id, isActive: true },
    include: { vaccine: true },
  });
  const children = await prisma.child.findMany({
    where: { id: { in: allChildIds } },
    include: {
      community: true,
      growthRecords: {
        include: { assessments: true, scheduledFollowUp: true },
      },
      vaccinations: true,
      alerts: true,
    },
  });
  if (children.length !== childDefinitions.length) {
    throw new Error(
      "DEMO FIXTURE VERIFY FAILED: fixture children are incomplete.",
    );
  }
  const childById = new Map(children.map((child) => [child.id, child]));
  const statuses = new Map(
    children.map((child) => [
      child.id,
      evaluateVaccinationScheduleForChild({
        dateOfBirth: child.dateOfBirth.toISOString().slice(0, 10),
        evaluationDate,
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
  const growthPercentile = (childId: string) =>
    Number(
      childById
        .get(childId)
        ?.growthRecords[0]?.assessments.find(
          ({ indicator }) => indicator === "WEIGHT_FOR_AGE",
        )?.percentile,
    );
  const hasAlert = (
    childId: string,
    type: "GROWTH" | "VACCINATION" | "MISSED_FOLLOW_UP",
  ) =>
    childById.get(childId)?.alerts.some((alert) => alert.type === type) ??
    false;
  const doseStatus = (childId: string, doseCode: string) =>
    statuses.get(childId)?.find((dose) => dose.doseCode === doseCode)?.status;
  const coverageFor = (childId: string) =>
    calculateDoseCoverage(
      [{ doses: statuses.get(childId) ?? [] }],
      "VARICELLA_1",
      evaluationDate,
    );
  const zeroCoverage = coverageFor(ids.children.coverageZero);
  const fullCoverage = coverageFor(ids.children.applied);

  const rows = [
    {
      Caso: "Crecimiento normal",
      "Niño ficticio": childById.get(ids.children.normal)?.fullName,
      "Estado esperado": "P5–P95, sin alerta de crecimiento",
      "Estado obtenido": `P${growthPercentile(ids.children.normal).toFixed(3)}, alerta=${hasAlert(ids.children.normal, "GROWTH")}`,
      Resultado:
        growthPercentile(ids.children.normal) >= 5 &&
        growthPercentile(ids.children.normal) <= 95 &&
        !hasAlert(ids.children.normal, "GROWTH"),
    },
    {
      Caso: "Peso/edad bajo",
      "Niño ficticio": childById.get(ids.children.low)?.fullName,
      "Estado esperado": "P<5 + alerta PREVENTIVE",
      "Estado obtenido": `P${growthPercentile(ids.children.low).toFixed(3)}, alerta=${hasAlert(ids.children.low, "GROWTH")}`,
      Resultado:
        growthPercentile(ids.children.low) < 5 &&
        hasAlert(ids.children.low, "GROWTH"),
    },
    {
      Caso: "Peso/edad alto",
      "Niño ficticio": childById.get(ids.children.high)?.fullName,
      "Estado esperado": "P>95 + alerta PREVENTIVE",
      "Estado obtenido": `P${growthPercentile(ids.children.high).toFixed(3)}, alerta=${hasAlert(ids.children.high, "GROWTH")}`,
      Resultado:
        growthPercentile(ids.children.high) > 95 &&
        hasAlert(ids.children.high, "GROWTH"),
    },
    {
      Caso: "Dosis atrasada aplicable",
      "Niño ficticio": childById.get(ids.children.overdue)?.fullName,
      "Estado esperado": "HEXAVALENT_1 OVERDUE",
      "Estado obtenido": `${doseStatus(ids.children.overdue, "HEXAVALENT_1")}, alerta=${hasAlert(ids.children.overdue, "VACCINATION")}`,
      Resultado:
        doseStatus(ids.children.overdue, "HEXAVALENT_1") === "OVERDUE" &&
        hasAlert(ids.children.overdue, "VACCINATION"),
    },
    {
      Caso: "Vacunas aplicadas",
      "Niño ficticio": childById.get(ids.children.applied)?.fullName,
      "Estado esperado": "VARICELLA_1 y MMR_1 APPLIED",
      "Estado obtenido": `${doseStatus(ids.children.applied, "VARICELLA_1")}/${doseStatus(ids.children.applied, "MMR_1")}`,
      Resultado:
        doseStatus(ids.children.applied, "VARICELLA_1") === "APPLIED" &&
        doseStatus(ids.children.applied, "MMR_1") === "APPLIED",
    },
    {
      Caso: "Cobertura 0 %",
      "Niño ficticio": childById.get(ids.children.coverageZero)?.fullName,
      "Estado esperado": "VARICELLA_1 OVERDUE; 0/1 · 0 %",
      "Estado obtenido": `${doseStatus(ids.children.coverageZero, "VARICELLA_1")}; ${zeroCoverage.numerator}/${zeroCoverage.denominator} · ${zeroCoverage.percentage} %`,
      Resultado:
        doseStatus(ids.children.coverageZero, "VARICELLA_1") === "OVERDUE" &&
        zeroCoverage.numerator === 0 &&
        zeroCoverage.denominator === 1 &&
        zeroCoverage.percentage === 0,
    },
    {
      Caso: "Cobertura 100 %",
      "Niño ficticio": childById.get(ids.children.applied)?.fullName,
      "Estado esperado": "VARICELLA_1 APPLIED; 1/1 · 100 %",
      "Estado obtenido": `${doseStatus(ids.children.applied, "VARICELLA_1")}; ${fullCoverage.numerator}/${fullCoverage.denominator} · ${fullCoverage.percentage} %`,
      Resultado:
        doseStatus(ids.children.applied, "VARICELLA_1") === "APPLIED" &&
        fullCoverage.numerator === 1 &&
        fullCoverage.denominator === 1 &&
        fullCoverage.percentage === 100,
    },
    {
      Caso: "Seguimiento vencido",
      "Niño ficticio": childById.get(ids.children.followUp)?.fullName,
      "Estado esperado": "Seguimiento abierto vencido + alerta",
      "Estado obtenido": `due=${childById.get(ids.children.followUp)?.growthRecords[0]?.scheduledFollowUp?.dueDate.toISOString().slice(0, 10)}, alerta=${hasAlert(ids.children.followUp, "MISSED_FOLLOW_UP")}`,
      Resultado:
        Boolean(
          childById.get(ids.children.followUp)?.growthRecords[0]
            ?.scheduledFollowUp,
        ) && hasAlert(ids.children.followUp, "MISSED_FOLLOW_UP"),
    },
    {
      Caso: "Dos comunidades",
      "Niño ficticio": "Conjunto completo",
      "Estado esperado": "2 comunidades en el centro autorizado",
      "Estado obtenido": `${new Set(children.map(({ communityId }) => communityId)).size} comunidades`,
      Resultado:
        children.every(
          (child) => child.community.healthCenterId === centerId,
        ) && new Set(children.map(({ communityId }) => communityId)).size === 2,
    },
  ].map((row) => ({
    ...row,
    Resultado: row.Resultado ? "PASS" : "FAIL",
  }));
  console.table(rows);
  if (rows.some(({ Resultado }) => Resultado === "FAIL")) {
    throw new Error(
      "DEMO FIXTURE VERIFY FAILED: an expected case did not pass.",
    );
  }
}

async function run() {
  await verifyIdentityWithPool();
  const center = await resolveHealthCenter();
  if (action === "load") {
    await loadFixtures(center.id);
    await verifyFixtures(center.id);
    return;
  }
  if (action === "verify") {
    await verifyFixtures(center.id);
    return;
  }
  await prisma.$transaction(async (transaction) => {
    await verifyIdentityInTransaction(transaction, configuration);
    await cleanFixtureRows(transaction);
  });
  console.log("Fixtures funcionales ficticios eliminados de forma segura.");
}

run()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Demo fixture failure.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
