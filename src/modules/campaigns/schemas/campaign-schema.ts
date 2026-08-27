import { z } from "zod";

export const campaignIdSchema = z.uuid("La campaña no es válida.");

export const campaignInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "El nombre debe tener al menos 3 caracteres.")
      .max(160),
    subject: z
      .string()
      .trim()
      .max(160)
      .transform((value) => value || null),
    message: z
      .string()
      .trim()
      .min(5, "El mensaje debe tener al menos 5 caracteres.")
      .max(3000),
    communityId: z.union([
      z.literal(""),
      z.uuid("Selecciona una comunidad válida."),
    ]),
    minimumAgeYears: z.coerce.number().int().min(0).max(17).optional(),
    maximumAgeYears: z.coerce.number().int().min(0).max(17).optional(),
    scheduleVersionCode: z.string().trim().max(80).optional(),
    doseCode: z.string().trim().max(120).optional(),
    doseStatus: z
      .union([z.literal(""), z.enum(["APPLIED", "PENDING", "OVERDUE"])])
      .optional()
      .transform((value) => value || undefined),
  })
  .refine(
    ({ minimumAgeYears, maximumAgeYears }) =>
      minimumAgeYears === undefined ||
      maximumAgeYears === undefined ||
      minimumAgeYears <= maximumAgeYears,
    {
      message: "La edad mínima no puede superar la edad máxima.",
      path: ["minimumAgeYears"],
    },
  )
  .refine(
    ({ scheduleVersionCode, doseCode, doseStatus }) => {
      return (
        (!doseCode && !doseStatus) ||
        Boolean(scheduleVersionCode && doseCode && doseStatus)
      );
    },
    {
      message: "Selecciona una versión, dosis y estado de vacunación válidos.",
      path: ["doseStatus"],
    },
  );

export type CampaignSegmentation = {
  communityId?: string;
  minimumAgeYears?: number;
  maximumAgeYears?: number;
  scheduleVersionCode?: string;
  doseCode?: string;
  doseStatus?: "APPLIED" | "PENDING" | "OVERDUE";
};
