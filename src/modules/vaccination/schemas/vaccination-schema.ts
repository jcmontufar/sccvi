import { z } from "zod";

import { getCurrentBusinessDate } from "@/lib/date/business-date";

export const vaccinationIdSchema = z.uuid(
  "El registro de vacunación no es válido.",
);
export const vaccineScheduleIdSchema = z.uuid("Selecciona una dosis válida.");

export function createVaccinationInputSchema(currentInstant = new Date()) {
  const currentBusinessDate = getCurrentBusinessDate({ currentInstant });
  return z.object({
    childId: z.uuid("El niño no es válido."),
    vaccineScheduleId: vaccineScheduleIdSchema,
    applicationDate: z.iso
      .date("Ingresa una fecha de aplicación válida.")
      .refine((value) => value <= currentBusinessDate, {
        message: "La fecha de aplicación no puede estar en el futuro.",
      }),
    notes: z
      .string()
      .trim()
      .max(1000, "Las notas no pueden superar 1000 caracteres.")
      .transform((value) => value || null),
  });
}

export type VaccinationInput = z.infer<
  ReturnType<typeof createVaccinationInputSchema>
>;
