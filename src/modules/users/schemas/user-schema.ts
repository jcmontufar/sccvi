import { z } from "zod";

import { applicationRoles } from "@/modules/auth/types";

export const userIdSchema = z.uuid("El usuario no es válido.");

const base = z.object({
  fullName: z
    .string({ error: "Ingresa el nombre completo." })
    .trim()
    .min(2, "Ingresa el nombre completo.")
    .max(120, "El nombre no puede superar 120 caracteres."),
  role: z.enum(applicationRoles, "Selecciona un rol válido."),
  healthCenterId: z
    .string({ error: "El centro de salud no es válido." })
    .refine(
      (id) => !id || z.uuid().safeParse(id).success,
      "El centro de salud no es válido.",
    ),
  guardianId: z
    .string({ error: "El tutor no es válido." })
    .refine(
      (id) => !id || z.uuid().safeParse(id).success,
      "El tutor no es válido.",
    ),
});

export const createUserSchema = base.extend({
  email: z
    .string({ error: "Ingresa un correo electrónico válido." })
    .trim()
    .toLowerCase()
    .email("Ingresa un correo electrónico válido.")
    .max(254, "El correo no puede superar 254 caracteres."),
});

export const updateUserSchema = base;
export const userStatusSchema = z.boolean();
