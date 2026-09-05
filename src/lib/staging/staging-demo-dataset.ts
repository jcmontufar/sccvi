export const stagingDemoMarker = "SCCVI_STAGING_DEMO_V1";
export const stagingDemoEvaluationDate = "2026-09-01";
export const stagingDemoConfirmation =
  "apply-integral-fictional-demo-to-isolated-staging";

export function requireStagingDemoConfirmation(
  environment: Record<string, string | undefined>,
) {
  if (
    environment.SCCVI_DEPLOYMENT_ENV !== "STAGING" ||
    environment.SCCVI_STAGING_DEMO_CONFIRMED !== stagingDemoConfirmation
  ) {
    throw new Error(
      "STAGING DEMO BLOCKED: explicit isolated-staging confirmation is missing.",
    );
  }
}

function fixtureUuid(sequence: number) {
  return `89000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
}

const communityNames = [
  "[STAGING DEMO] El Manantial",
  "[STAGING DEMO] Las Flores",
  "[STAGING DEMO] San Miguel",
  "[STAGING DEMO] Los Pinos",
  "[STAGING DEMO] Buena Vista",
] as const;

const childBlueprints = [
  ["Ana Desarrollo Regular", "2026-01-15", "FEMALE", "normal"],
  ["Benjamín Peso Bajo", "2026-01-15", "MALE", "low"],
  ["Clara Peso Alto", "2026-01-15", "FEMALE", "high"],
  ["Diego Hexavalente Atrasada", "2026-02-01", "MALE", "overdue"],
  ["Elena Varicela Atrasada", "2025-01-12", "FEMALE", "overdue"],
  ["Fabio Vacunación Al Día", "2025-01-12", "MALE", "applied"],
  ["Gabriela Seguimiento Vencido", "2026-01-15", "FEMALE", "follow-up"],
  ["Hugo Esquema Pendiente", "2026-08-01", "MALE", "pending"],
  ["Isabel Lactante Pendiente", "2026-07-20", "FEMALE", "pending"],
  ["Javier Vacunación Al Día", "2026-02-15", "MALE", "applied"],
  ["Karla Vacunación Atrasada", "2026-03-01", "FEMALE", "overdue"],
  ["Luis Control Histórico", "2025-06-15", "MALE", "normal"],
  ["María Control Histórico", "2025-09-01", "FEMALE", "normal"],
  ["Nicolás Vacunación Al Día", "2026-04-01", "MALE", "applied"],
  ["Olivia Esquema Pendiente", "2026-08-15", "FEMALE", "pending"],
  ["Pablo Peso Bajo", "2026-04-10", "MALE", "low"],
  ["Rosa Peso Alto", "2026-04-10", "FEMALE", "high"],
  ["Samuel Seguimiento Vencido", "2026-06-01", "MALE", "follow-up"],
] as const;

export type StagingDemoChildScenario =
  "normal" | "low" | "high" | "overdue" | "applied" | "pending" | "follow-up";

export function buildStagingDemoPlan() {
  const communities = communityNames.map((name, index) => ({
    id: fixtureUuid(100 + index),
    name,
    location: `Sector ficticio ${index + 1}`,
    estimatedFamilies: 40 + index * 10,
  }));
  const children = childBlueprints.map(
    ([name, dateOfBirth, sex, scenario], index) => ({
      id: fixtureUuid(300 + index),
      fullName: `[STAGING DEMO] ${name}`,
      dateOfBirth,
      sex,
      scenario: scenario as StagingDemoChildScenario,
      communityId: communities[index % communities.length].id,
      guardian: {
        id: fixtureUuid(200 + index),
        fullName: `[STAGING DEMO] Tutor ${String(index + 1).padStart(2, "0")}`,
      },
      relationId: fixtureUuid(400 + index),
    }),
  );
  return { communities, children };
}
