import { z } from "zod";

export const vaccineIdSchema = z.uuid("La vacuna no es válida.");

export const vaccineInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(120, "El nombre no puede superar 120 caracteres."),
  description: z
    .string()
    .trim()
    .max(1000, "La descripción no puede superar 1000 caracteres.")
    .transform((value) => value || null),
});

export const vaccineSearchSchema = z.object({
  search: z.string().trim().max(120).default(""),
  status: z.enum(["active", "inactive", "all"]).default("active"),
});

export type VaccineInput = z.infer<typeof vaccineInputSchema>;
