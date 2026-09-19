import { z } from "zod";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum, `No puede superar ${maximum} caracteres.`)
    .transform((value) => value || null);

export const guardianIdSchema = z.uuid("El tutor no es válido.");

export const guardianInputSchema = z.object({
  communityId: z.uuid("Selecciona una comunidad válida."),
  userId: z.union([z.uuid(), z.null()]).optional(),
  fullName: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres.")
    .max(160, "El nombre no puede superar 160 caracteres."),
  identification: optionalText(80),
  phone: optionalText(40),
  email: z
    .union([z.literal(""), z.email("Ingresa un correo electrónico válido.")])
    .transform((value) => value || null),
  preferredNotificationChannel: z
    .union([z.literal(""), z.enum(["EMAIL", "TELEGRAM"])])
    .transform((value) => value || null),
});

export const guardianSearchSchema = z.object({
  search: z.string().trim().max(120).default(""),
  status: z.enum(["all", "active", "inactive"]).default("active"),
  communityId: z.union([z.literal(""), z.uuid()]).default(""),
});

export type GuardianInput = z.infer<typeof guardianInputSchema>;
