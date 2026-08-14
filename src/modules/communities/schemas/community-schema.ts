import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(240, "La ubicación no puede superar 240 caracteres.")
  .transform((value) => value || null);

const estimatedFamilies = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce
    .number({ error: "La cantidad estimada de familias debe ser un número." })
    .int("La cantidad debe ser un número entero.")
    .min(0, "La cantidad no puede ser negativa.")
    .max(1_000_000, "La cantidad estimada es demasiado grande.")
    .optional(),
);

export const communityIdSchema = z.uuid("La comunidad no es válida.");

export const communityInputSchema = z.object({
  healthCenterId: z.uuid("Selecciona un centro de salud válido."),
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(120, "El nombre no puede superar 120 caracteres."),
  location: optionalText,
  estimatedFamilies,
});

export const communitySearchSchema = z.object({
  search: z.string().trim().max(120).default(""),
  status: z.enum(["all", "active", "inactive"]).default("active"),
  healthCenterId: z.union([z.literal(""), z.uuid()]).default(""),
});

export type CommunityInput = z.infer<typeof communityInputSchema>;
export type CommunitySearch = z.infer<typeof communitySearchSchema>;
