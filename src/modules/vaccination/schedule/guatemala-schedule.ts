import { createHash } from "node:crypto";

import { z } from "zod";

const dateOnlySchema = z.iso.date();
const ageSchema = z.number().int().min(0).max(240);

const vaccineSchema = z.object({
  code: z.string().regex(/^[A-Z0-9_]+$/),
  name: z.string().trim().min(2).max(160),
  aliases: z.array(z.string().trim().min(1).max(160)).default([]),
});

const doseSchema = z
  .object({
    code: z.string().regex(/^[A-Z0-9_]+$/),
    vaccineCode: z.string().regex(/^[A-Z0-9_]+$/),
    doseNumber: z.number().int().positive(),
    doseName: z.string().trim().min(2).max(120),
    recommendedAgeMonths: ageSchema.optional(),
    recommendedAgeDays: ageSchema.optional(),
    minimumAgeMonths: ageSchema.optional(),
    minimumAgeDays: ageSchema.optional(),
    maximumAgeMonths: ageSchema.optional(),
    maximumAgeDays: ageSchema.optional(),
    maximumAgeExclusive: z.boolean().default(false),
    timingNote: z.string().trim().min(3).max(500).optional(),
  })
  .refine(
    (dose) =>
      dose.recommendedAgeMonths !== undefined ||
      dose.recommendedAgeDays !== undefined,
    "Cada dosis debe definir una edad recomendada.",
  );

const scheduleArtifactSchema = z
  .object({
    version: z.object({
      code: z.string().regex(/^[A-Z0-9-]+$/),
      name: z.string().trim().min(3).max(200),
      authority: z.string().trim().min(3).max(240),
      publishedAt: dateOnlySchema,
      effectiveFrom: dateOnlySchema,
      effectiveTo: dateOnlySchema.optional(),
      sourceUrl: z.url().refine((url) => url.startsWith("https://")),
      sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
    }),
    vaccines: z.array(vaccineSchema).min(1),
    doses: z.array(doseSchema).min(1),
  })
  .refine(
    (artifact) =>
      !artifact.version.effectiveTo ||
      artifact.version.effectiveFrom <= artifact.version.effectiveTo,
    {
      message: "El intervalo de vigencia del esquema no es válido.",
      path: ["version", "effectiveTo"],
    },
  )
  .superRefine((artifact, context) => {
    const vaccineCodes = new Set<string>();
    for (const [index, vaccine] of artifact.vaccines.entries()) {
      if (vaccineCodes.has(vaccine.code)) {
        context.addIssue({
          code: "custom",
          message: `Código de vacuna duplicado: ${vaccine.code}.`,
          path: ["vaccines", index, "code"],
        });
      }
      vaccineCodes.add(vaccine.code);
    }

    const doseCodes = new Set<string>();
    for (const [index, dose] of artifact.doses.entries()) {
      if (doseCodes.has(dose.code)) {
        context.addIssue({
          code: "custom",
          message: `Código de dosis duplicado: ${dose.code}.`,
          path: ["doses", index, "code"],
        });
      }
      doseCodes.add(dose.code);
      if (!vaccineCodes.has(dose.vaccineCode)) {
        context.addIssue({
          code: "custom",
          message: `La dosis ${dose.code} referencia una vacuna inexistente.`,
          path: ["doses", index, "vaccineCode"],
        });
      }
    }
  });

export const guatemalaScheduleArtifact = {
  fileName: "gt-mspas-2026-01.json",
  expectedRows: 21,
  sha256: "2f41138f393a6ee7707513886263f2dd8ed0cc07cab49e30f280949ae7350aae",
} as const;

export function sha256(text: string) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function parseGuatemalaScheduleArtifact(text: string) {
  const artifact = scheduleArtifactSchema.parse(JSON.parse(text));
  if (artifact.doses.length !== guatemalaScheduleArtifact.expectedRows) {
    throw new Error(
      `Se esperaban ${guatemalaScheduleArtifact.expectedRows} dosis y se encontraron ${artifact.doses.length}.`,
    );
  }
  return artifact;
}

export type GuatemalaScheduleArtifact = ReturnType<
  typeof parseGuatemalaScheduleArtifact
>;
