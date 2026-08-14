import { z } from "zod";

import { getCurrentBusinessDate } from "@/lib/date/business-date";

export const growthRecordIdSchema = z.uuid("La medición no es válida.");

export function createGrowthRecordSchema(currentInstant = new Date()) {
  const currentBusinessDate = getCurrentBusinessDate({ currentInstant });

  return z.object({
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
    notes: z
      .string()
      .trim()
      .max(1000, "Las notas no pueden superar 1000 caracteres.")
      .transform((value) => value || null),
  });
}

export function createGrowthCorrectionSchema(currentInstant = new Date()) {
  return createGrowthRecordSchema(currentInstant).extend({
    correctionReason: z
      .string()
      .trim()
      .min(5, "Explica brevemente el motivo de la corrección.")
      .max(500, "El motivo no puede superar 500 caracteres."),
  });
}
