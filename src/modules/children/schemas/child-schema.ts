import { z } from "zod";

export const childIdSchema = z.uuid("El niño no es válido.");

export const childInputSchema = z.object({
  communityId: z.uuid("Selecciona una comunidad válida."),
  fullName: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres.")
    .max(160, "El nombre no puede superar 160 caracteres."),
  dateOfBirth: z.iso
    .date("Ingresa una fecha de nacimiento válida.")
    .refine((value) => value <= new Date().toISOString().slice(0, 10), {
      message: "La fecha de nacimiento no puede estar en el futuro.",
    }),
  sex: z.enum(["MALE", "FEMALE"], {
    error: "Selecciona el sexo registrado.",
  }),
});

export const childSearchSchema = z.object({
  search: z.string().trim().max(120).default(""),
  status: z.enum(["all", "active", "inactive"]).default("active"),
  communityId: z.union([z.literal(""), z.uuid()]).default(""),
});

export const childGuardianInputSchema = z.object({
  guardianId: z.uuid("Selecciona un tutor válido."),
  relationshipType: z
    .string()
    .trim()
    .max(80, "La relación no puede superar 80 caracteres.")
    .transform((value) => value || null),
  isPrimary: z.coerce.boolean().default(false),
});

export type ChildInput = z.infer<typeof childInputSchema>;
