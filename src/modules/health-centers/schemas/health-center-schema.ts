import { z } from "zod";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum, `No puede superar ${maximum} caracteres.`)
    .transform((value) => value || null);

export const healthCenterIdSchema = z.uuid("El centro de salud no es válido.");

export const updateHealthCenterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(120, "El nombre no puede superar 120 caracteres."),
  code: optionalText(40),
  address: optionalText(240),
  phone: optionalText(40),
  email: z
    .union([z.literal(""), z.email("Ingresa un correo electrónico válido.")])
    .transform((value) => value || null),
});

export type UpdateHealthCenterInput = z.infer<typeof updateHealthCenterSchema>;
