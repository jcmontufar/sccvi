import { z } from "zod";

import { getCurrentBusinessDate } from "@/lib/date/business-date";

export const growthRecordIdSchema = z.uuid("La medición no es válida.");

function growthRecordFields(currentInstant: Date) {
  const currentBusinessDate = getCurrentBusinessDate({ currentInstant });

  return {
    measurementDate: z.iso
      .date("Ingresa una fecha de medición válida.")
      .refine((value) => value <= currentBusinessDate, {
        message: "La fecha de medición no puede estar en el futuro.",
      }),
    weightKg: z.coerce
      .number({ error: "El peso debe ser un número." })
      .finite()
      .positive("El peso debe ser mayor que cero."),
    heightCm: z.coerce
      .number({ error: "La talla debe ser un número." })
      .finite()
      .positive("La talla debe ser mayor que cero."),
    measurementMethod: z.enum(
      ["RECUMBENT_LENGTH", "STANDING_HEIGHT"],
      "Selecciona cómo se tomó la talla.",
    ),
    notes: z
      .string()
      .trim()
      .max(1000, "Las notas no pueden superar 1000 caracteres.")
      .transform((value) => value || null),
  } as const;
}

export function createGrowthRecordSchema(currentInstant = new Date()) {
  return z
    .object({
      ...growthRecordFields(currentInstant),
      nextFollowUpDate: z.preprocess(
        (value) => (value === "" || value === null ? undefined : value),
        z.iso.date("Ingresa una fecha de seguimiento válida.").optional(),
      ),
    })
    .superRefine((value, context) => {
      if (
        value.nextFollowUpDate &&
        value.nextFollowUpDate <= value.measurementDate
      ) {
        context.addIssue({
          code: "custom",
          path: ["nextFollowUpDate"],
          message:
            "La próxima fecha de seguimiento debe ser posterior a la medición.",
        });
      }
    });
}

export function createGrowthCorrectionSchema(currentInstant = new Date()) {
  return z.object({
    ...growthRecordFields(currentInstant),
    correctionReason: z
      .string()
      .trim()
      .min(5, "Explica brevemente el motivo de la corrección.")
      .max(500, "El motivo no puede superar 500 caracteres."),
  });
}
