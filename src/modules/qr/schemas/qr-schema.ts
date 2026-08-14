import { z } from "zod";

export const qrTokenInputSchema = z.object({
  expiresAt: z
    .union([z.literal(""), z.iso.datetime({ offset: true })])
    .transform((value) => (value ? new Date(value) : null)),
  pin: z
    .union([
      z.literal(""),
      z
        .string()
        .regex(/^\d{4,12}$/, "El PIN debe contener entre 4 y 12 dígitos."),
    ])
    .transform((value) => value || null),
});

export const qrOpaqueTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "La credencial no es válida.");

export const qrPinSchema = z
  .string()
  .regex(/^\d{4,12}$/, "El PIN no es válido.");
